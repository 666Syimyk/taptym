import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq, gt, inArray, isNull, or, sql } from 'drizzle-orm';
import { DB, type AppDb } from '../../database/database.module';
import {
  categories,
  claimEvidence,
  itemMedia,
  items,
  messages,
  riskEvents,
  type ItemMediaRow,
} from '../../database/schema';
import { APP_CONFIG, type AppConfig } from '../../config/app-config';
import { AppError } from '../../common/errors';
import { hmacHex, randomToken, safeEqualHex } from '../../common/crypto';
import { STORAGE, type StorageAdapter } from './storage.adapter';
import { hammingDistance, prepareForAi, processImage, sniffImage } from './image.processor';
import { AI_PROVIDER, type AiProvider } from '../ai/ai.provider';

export interface MediaView {
  id: string;
  status: ItemMediaRow['processingStatus'];
  publicUrl: string | null;
  thumbUrl: string | null;
  width: number | null;
  height: number | null;
  safetyCheck: string | null;
  /** Suggestions are only returned to the uploader during item creation. */
  suggestions?: Record<string, unknown> | null;
}

const PROTECTED_LINK_TTL_SECONDS = 300;

@Injectable()
export class MediaService {
  private readonly logger = new Logger('Media');

  constructor(
    @Inject(DB) private readonly db: AppDb,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
    @Inject(STORAGE) private readonly storage: StorageAdapter,
    @Inject(AI_PROVIDER) private readonly ai: AiProvider,
  ) {}

  /** Step 1 of the upload protocol: create a pending media record (PRD §22.6). */
  async createUploadSession(uploaderId: string) {
    const [row] = await this.db
      .insert(itemMedia)
      .values({ uploaderId, processingStatus: 'PENDING_UPLOAD' })
      .returning();
    return {
      mediaId: row.id,
      uploadUrl: `${this.cfg.publicBaseUrl}/v1/media/${row.id}/upload`,
      maxBytes: this.cfg.storage.maxBytes,
      accept: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
    };
  }

  /**
   * Step 2: receive the bytes, validate, scan, strip metadata, mask, store variants.
   * `categorySlug` lets the pipeline apply category publication policy (documents,
   * bank cards and keys never get a public photo, regardless of AI availability).
   */
  async upload(
    mediaId: string,
    uploaderId: string,
    file: Buffer,
    categorySlug?: string,
    wantSuggestions = true,
    listingType: 'LOST' | 'FOUND' = 'FOUND',
  ): Promise<MediaView> {
    const [row] = await this.db.select().from(itemMedia).where(eq(itemMedia.id, mediaId));
    if (!row) throw AppError.notFound();
    if (row.uploaderId !== uploaderId) throw AppError.forbidden();
    if (row.processingStatus !== 'PENDING_UPLOAD') throw AppError.conflict();
    if (file.length > this.cfg.storage.maxBytes) throw AppError.badRequest('media.too_large');

    const sniffed = await sniffImage(file);
    if (!sniffed) {
      await this.db
        .update(itemMedia)
        .set({ processingStatus: 'REJECTED' })
        .where(eq(itemMedia.id, mediaId));
      throw AppError.badRequest('media.invalid_file');
    }
    await this.db
      .update(itemMedia)
      .set({ processingStatus: 'PROCESSING' })
      .where(eq(itemMedia.id, mediaId));
    const mime =
      sniffed.format === 'jpeg'
        ? 'image/jpeg'
        : sniffed.format === 'png'
          ? 'image/png'
          : 'image/webp';
    // AI engines get an upright, metadata-free JPEG of a sensible size: no GPS or
    // device data leaves the server, and large phone photos stay under API limits.
    const aiImage = await prepareForAi(file);

    // Category policy first: restricted categories keep only a protected copy.
    let policy = 'standard';
    if (categorySlug) {
      const [cat] = await this.db
        .select()
        .from(categories)
        .where(eq(categories.slug, categorySlug));
      policy = cat?.publicationPolicy ?? 'standard';
    }

    // Mandatory safety check (never bypassed on AI failure → manual review path) and the
    // optional form-filling suggestions run side by side: people wait for both on screen.
    const suggest = wantSuggestions && this.ai.enabled && policy !== 'restricted_photo';
    const [safety, rawAnalysis] = await Promise.all([
      policy === 'restricted_photo'
        ? Promise.resolve({ status: 'blocked' as const, findings: [], regions: [] })
        : this.ai.checkSensitive(aiImage, 'image/jpeg'),
      suggest
        ? this.db
            .select({ slug: categories.slug, nameRu: categories.nameRu })
            .from(categories)
            .where(eq(categories.active, true))
            .then((cats) =>
              this.ai.analyzeImage(aiImage, 'image/jpeg', { listingType, categories: cats }),
            )
            .catch(() => null)
        : Promise.resolve(null),
    ]);
    // A photo with personal data only tells which category it is: no title or
    // description that could carry what was written on it.
    const analysis =
      safety.status === 'blocked'
        ? rawAnalysis?.categorySlug
          ? {
              categorySlug: rawAnalysis.categorySlug,
              confidence: rawAnalysis.confidence,
              source: rawAnalysis.source,
            }
          : null
        : rawAnalysis;
    const holdsDocument = safety.findings.some(
      (f) => f === 'identity_document' || f === 'bank_card',
    );

    const protectedKey = `${mediaId}-orig.${sniffed.format === 'png' ? 'png' : 'jpg'}`;
    // Protected original kept only for standard categories; documents and cards are
    // not retained even when the person picked another category (PRD §17.3).
    const keepOriginal = policy !== 'restricted_photo' && !holdsDocument;
    if (keepOriginal) {
      await this.storage.put('protected', protectedKey, file, mime);
    }

    const processed = await processImage(file, safety.regions);
    const duplicate = await this.findDuplicate(
      processed.contentHash,
      processed.perceptualHash,
      uploaderId,
      mediaId,
    );

    let status: ItemMediaRow['processingStatus'];
    let publicKey: string | null = null;
    let thumbKey: string | null = null;
    if (safety.status === 'blocked') {
      status = 'BLOCKED_SENSITIVE';
    } else {
      publicKey = `${mediaId}.webp`;
      thumbKey = `${mediaId}-thumb.webp`;
      await this.storage.put('public', publicKey, processed.publicWebp, 'image/webp');
      await this.storage.put('public', thumbKey, processed.thumbWebp, 'image/webp');
      status = safety.status === 'passed' ? 'READY' : 'READY_UNCHECKED';
    }

    const [updated] = await this.db
      .update(itemMedia)
      .set({
        processingStatus: status,
        publicVariantKey: publicKey,
        thumbVariantKey: thumbKey,
        protectedVariantKey: keepOriginal ? protectedKey : null,
        contentHash: processed.contentHash,
        perceptualHash: processed.perceptualHash,
        width: processed.width,
        height: processed.height,
        sizeBytes: file.length,
        aiSuggestions: analysis
          ? { ...analysis, duplicateSuspected: duplicate }
          : duplicate
            ? { duplicateSuspected: true }
            : null,
        safetyCheck: safety.status,
      })
      .where(eq(itemMedia.id, mediaId))
      .returning();

    if (duplicate) {
      await this.db.insert(riskEvents).values({
        userId: uploaderId,
        signal: 'duplicate_image_upload',
        severity: 1,
        context: { mediaId },
      });
    }
    return this.view(updated, true);
  }

  private async findDuplicate(
    contentHash: string,
    pHash: string,
    uploaderId: string,
    selfId: string,
  ): Promise<boolean> {
    const since = new Date(Date.now() - 30 * 86_400_000);
    const rows = await this.db
      .select({
        id: itemMedia.id,
        contentHash: itemMedia.contentHash,
        perceptualHash: itemMedia.perceptualHash,
        uploaderId: itemMedia.uploaderId,
      })
      .from(itemMedia)
      .where(
        and(
          gt(itemMedia.createdAt, since),
          sql`${itemMedia.id} <> ${selfId}`,
          eq(itemMedia.uploaderId, uploaderId),
        ),
      );
    return rows.some(
      (r) =>
        r.contentHash === contentHash ||
        (r.perceptualHash && hammingDistance(r.perceptualHash, pHash) <= 6),
    );
  }

  view(row: ItemMediaRow, includeSuggestions = false): MediaView {
    return {
      id: row.id,
      status: row.processingStatus,
      publicUrl: row.publicVariantKey
        ? this.variantUrl(row.publicVariantKey, includeSuggestions)
        : null,
      thumbUrl: row.thumbVariantKey
        ? this.variantUrl(row.thumbVariantKey, includeSuggestions)
        : null,
      width: row.width,
      height: row.height,
      safetyCheck: row.safetyCheck,
      ...(includeSuggestions ? { suggestions: row.aiSuggestions ?? null } : {}),
    };
  }

  async status(mediaId: string, requesterId: string): Promise<MediaView> {
    const [row] = await this.db.select().from(itemMedia).where(eq(itemMedia.id, mediaId));
    if (!row) throw AppError.notFound();
    if (row.uploaderId !== requesterId) throw AppError.forbidden();
    return this.view(row, true);
  }

  async getForItem(itemId: string): Promise<ItemMediaRow[]> {
    return this.db
      .select()
      .from(itemMedia)
      .where(eq(itemMedia.itemId, itemId))
      .orderBy(itemMedia.sortOrder);
  }

  /** Attach uploaded media to an item; validates ownership and readiness. */
  async attach(mediaIds: string[], itemId: string, ownerId: string): Promise<ItemMediaRow[]> {
    const rows: ItemMediaRow[] = [];
    for (const [i, id] of mediaIds.entries()) {
      const [row] = await this.db.select().from(itemMedia).where(eq(itemMedia.id, id));
      if (!row) throw AppError.notFound();
      if (row.uploaderId !== ownerId) throw AppError.badRequest('item.media_not_owned');
      if (row.itemId && row.itemId !== itemId) throw AppError.badRequest('item.media_not_owned');
      if (!['READY', 'READY_UNCHECKED', 'BLOCKED_SENSITIVE'].includes(row.processingStatus)) {
        throw AppError.badRequest('item.media_not_ready');
      }
      const [updated] = await this.db
        .update(itemMedia)
        .set({ itemId, sortOrder: i })
        .where(eq(itemMedia.id, id))
        .returning();
      rows.push(updated);
    }
    // Detach media no longer referenced
    await this.db
      .update(itemMedia)
      .set({ itemId: null })
      .where(
        and(
          eq(itemMedia.itemId, itemId),
          mediaIds.length
            ? sql`${itemMedia.id} NOT IN (${sql.join(
                mediaIds.map((m) => sql`${m}`),
                sql`, `,
              )})`
            : sql`true`,
        ),
      );
    return rows;
  }

  async readPublic(key: string): Promise<Buffer | null> {
    // Opaque object names are not authorization. Drafts, unchecked uploads and
    // removed listings must remain private even when someone has the old URL.
    const [row] = await this.db
      .select({ id: itemMedia.id })
      .from(itemMedia)
      .innerJoin(items, eq(items.id, itemMedia.itemId))
      .innerJoin(categories, eq(categories.id, items.categoryId))
      .where(
        and(
          or(eq(itemMedia.publicVariantKey, key), eq(itemMedia.thumbVariantKey, key)),
          inArray(items.listingStatus, ['PUBLISHED', 'RESOLVED']),
          inArray(itemMedia.processingStatus, ['READY', 'READY_UNCHECKED']),
          sql`${categories.publicationPolicy} <> 'restricted_photo'`,
        ),
      );
    if (!row) return null;
    return this.storage.get('public', key);
  }

  private variantUrl(key: string, preview: boolean): string {
    if (!preview) return `${this.cfg.publicBaseUrl}/v1/media/public/${encodeURIComponent(key)}`;
    const exp = Math.floor(Date.now() / 1000) + PROTECTED_LINK_TTL_SECONDS;
    const sig = hmacHex(this.cfg.auth.otpHmacSecret, `preview:${key}:${exp}`);
    return `${this.cfg.publicBaseUrl}/v1/media/preview/${encodeURIComponent(key)}?exp=${exp}&sig=${sig}`;
  }

  async readPreview(key: string, exp: string, sig: string): Promise<Buffer | null> {
    const n = Number(exp);
    if (
      !Number.isSafeInteger(n) ||
      n < Math.floor(Date.now() / 1000) ||
      n > Math.floor(Date.now() / 1000) + PROTECTED_LINK_TTL_SECONDS
    )
      return null;
    if (!safeEqualHex(hmacHex(this.cfg.auth.otpHmacSecret, `preview:${key}:${n}`), sig))
      return null;
    return this.storage.get('public', key);
  }

  /** Short-lived signed link to a protected original (moderators / disputes only). */
  signProtectedLink(key: string): string {
    const exp = Math.floor(Date.now() / 1000) + PROTECTED_LINK_TTL_SECONDS;
    const sig = hmacHex(this.cfg.auth.otpHmacSecret, `${key}:${exp}`);
    return `${this.cfg.publicBaseUrl}/v1/media/protected/${encodeURIComponent(key)}?exp=${exp}&sig=${sig}`;
  }

  async readProtected(key: string, exp: string, sig: string): Promise<Buffer | null> {
    const expNum = Number(exp);
    if (!Number.isFinite(expNum) || expNum < Math.floor(Date.now() / 1000)) return null;
    const expected = hmacHex(this.cfg.auth.otpHmacSecret, `${key}:${expNum}`);
    if (!safeEqualHex(expected, sig)) return null;
    return this.storage.get('protected', key);
  }

  /** Housekeeping: delete uploads that were never attached (runs from the scheduler). */
  async purgeOrphans(olderThanHours = 24) {
    const cutoff = new Date(Date.now() - olderThanHours * 3_600_000);
    const rows = await this.db
      .select()
      .from(itemMedia)
      .where(
        and(
          isNull(itemMedia.itemId),
          sql`${itemMedia.createdAt} < ${cutoff}`,
          sql`NOT EXISTS (SELECT 1 FROM ${claimEvidence} WHERE ${claimEvidence.protectedStorageReference} = ${itemMedia.id}::text)`,
          sql`NOT EXISTS (SELECT 1 FROM ${messages} WHERE ${messages.attachmentMediaId} = ${itemMedia.id})`,
        ),
      );
    for (const r of rows) {
      if (r.publicVariantKey) await this.storage.delete('public', r.publicVariantKey);
      if (r.thumbVariantKey) await this.storage.delete('public', r.thumbVariantKey);
      if (r.protectedVariantKey) await this.storage.delete('protected', r.protectedVariantKey);
      await this.db.delete(itemMedia).where(eq(itemMedia.id, r.id));
    }
    if (rows.length) this.logger.log(`Purged ${rows.length} orphan media`);
    return rows.length;
  }

  newKey() {
    return randomToken(16);
  }
}
