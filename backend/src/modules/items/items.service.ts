import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, desc, eq, gte, inArray, lt, lte, or, sql, SQL } from 'drizzle-orm';
import { DB, type AppDb } from '../../database/database.module';
import {
  categories,
  claims,
  idempotencyKeys,
  itemMedia,
  itemPrivateDetails,
  items,
  locations,
  moderationCases,
  users,
  type Item,
  type User,
} from '../../database/schema';
import { AppError } from '../../common/errors';
import { APP_CONFIG, type AppConfig } from '../../config/app-config';
import { clampText, normalizeSearchText, queryVariants } from '../../common/text';
import { isValidDestination, normalizeDestination } from '../../common/crypto';
import { clampLimit, decodeCursor, encodeCursor, type Page } from '../../common/pagination';
import { MediaService } from '../media/media.service';
import { AccountsService } from '../accounts/accounts.service';
import { MatchingService } from '../matching/matching.service';
import { AuditService } from '../audit/audit.service';
import { toItemCard, type ItemCard, type ItemContext, type ItemDetail } from './item-view';
import type { CreateItemDto, ItemsQueryDto, UpdateItemDto } from './items.dto';
import { scanListingText } from './listing-text';

const PUBLIC_STATUSES = ['PUBLISHED', 'RESOLVED'] as const;

/** Normalizes a listing phone to +996…; '' clears it; anything unparsable is rejected. */
function contactPhone(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined;
  if (!raw.trim()) return '';
  const phone = normalizeDestination('phone', raw);
  if (!isValidDestination('phone', phone))
    throw AppError.badRequest('error.validation', { field: 'contactPhone' });
  return phone;
}

@Injectable()
export class ItemsService {
  private readonly logger = new Logger('Items');

  constructor(
    @Inject(DB) private readonly db: AppDb,
    private readonly media: MediaService,
    private readonly accounts: AccountsService,
    private readonly matching: MatchingService,
    private readonly audit: AuditService,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
  ) {}

  // ---------- loading ----------

  async loadContext(itemIds: string[]): Promise<Map<string, ItemContext>> {
    const result = new Map<string, ItemContext>();
    if (itemIds.length === 0) return result;
    const rows = await this.db.select().from(items).where(inArray(items.id, itemIds));
    if (rows.length === 0) return result;
    const cats = await this.db.select().from(categories);
    const locs = await this.db.select().from(locations);
    const owners = await this.db
      .select()
      .from(users)
      .where(inArray(users.id, [...new Set(rows.map((r) => r.ownerAccountId))]));
    const media = await this.db
      .select()
      .from(itemMedia)
      .where(inArray(itemMedia.itemId, itemIds))
      .orderBy(itemMedia.sortOrder);
    const trust = new Map<string, string>();
    for (const o of owners) trust.set(o.id, await this.accounts.trustLevel(o));
    for (const item of rows) {
      const category = cats.find((c) => c.id === item.categoryId)!;
      const location = locs.find((l) => l.id === item.approximateLocationId) ?? null;
      const parentLocation = location?.parentId
        ? (locs.find((l) => l.id === location.parentId) ?? null)
        : null;
      const owner = owners.find((o) => o.id === item.ownerAccountId)!;
      result.set(item.id, {
        item,
        category,
        location,
        parentLocation,
        media: media.filter((m) => m.itemId === item.id),
        owner: { id: owner.id, publicName: owner.publicName },
        ownerTrustLevel: trust.get(owner.id) ?? 'Guest',
      });
    }
    return result;
  }

  async card(itemId: string, viewerId?: string): Promise<ItemCard | null> {
    const ctx = (await this.loadContext([itemId])).get(itemId);
    return ctx ? toItemCard(ctx, this.media, viewerId) : null;
  }

  // ---------- feed / search ----------

  async list(q: ItemsQueryDto, viewerId?: string): Promise<Page<ItemCard>> {
    const limit = clampLimit(q.limit);
    const conds: SQL[] = [];
    const status = q.status ?? 'PUBLISHED';
    conds.push(eq(items.listingStatus, status));
    if (q.type) conds.push(eq(items.listingType, q.type));
    if (q.categoryId) conds.push(eq(items.categoryId, q.categoryId));
    if (q.color) conds.push(eq(items.color, q.color));
    if (q.brand) conds.push(sql`lower(${items.brand}) = ${q.brand.toLowerCase()}`);
    if (q.withReward === 'true')
      conds.push(sql`(${items.rewardAmount} IS NOT NULL OR ${items.rewardNote} IS NOT NULL)`);
    if (q.locationId) {
      const locIds = await this.locationWithChildren(q.locationId);
      conds.push(inArray(items.approximateLocationId, locIds));
    }
    if (q.dateFrom)
      conds.push(
        or(
          gte(items.eventTimeEnd, new Date(q.dateFrom)),
          gte(items.eventTimeStart, new Date(q.dateFrom)),
        )!,
      );
    if (q.dateTo)
      conds.push(
        or(
          lte(items.eventTimeStart, new Date(q.dateTo)),
          lte(items.eventTimeEnd, new Date(q.dateTo)),
        )!,
      );

    let relevance: SQL | null = null;
    const variants = q.q ? queryVariants(q.q) : [];
    if (variants.length) {
      const likeConds = variants.map((v) => sql`${items.searchText} ILIKE ${'%' + v + '%'}`);
      const simConds = variants.map((v) => sql`similarity(${items.searchText}, ${v}) > 0.2`);
      conds.push(or(...likeConds, ...simConds)!);
      relevance = sql`GREATEST(${sql.join(
        variants.map((v) => sql`similarity(${items.searchText}, ${v})`),
        sql`, `,
      )})`;
    }

    const cursor = decodeCursor(q.cursor);
    const useRelevance = relevance && q.sort !== 'newest';
    if (cursor && !useRelevance) {
      conds.push(
        or(
          lt(items.createdAt, new Date(cursor.ts)),
          and(eq(items.createdAt, new Date(cursor.ts)), lt(items.id, cursor.id)),
        )!,
      );
    }

    let query = this.db
      .select({ id: items.id, createdAt: items.createdAt })
      .from(items)
      .where(and(...conds))
      .$dynamic();
    if (useRelevance && relevance) {
      // Relevance mode uses offset-style cursor (page number) for simplicity.
      const offset = cursor ? Number(cursor.id) || 0 : 0;
      query = query
        .orderBy(desc(relevance), desc(items.createdAt))
        .limit(limit + 1)
        .offset(offset);
      const rows = await query;
      const ids = rows.slice(0, limit).map((r) => r.id);
      const ctx = await this.loadContext(ids);
      return {
        items: ids.map((id) => toItemCard(ctx.get(id)!, this.media, viewerId)),
        nextCursor:
          rows.length > limit ? encodeCursor({ ts: 'offset', id: String(offset + limit) }) : null,
      };
    }
    query = query.orderBy(desc(items.createdAt), desc(items.id)).limit(limit + 1);
    const rows = await query;
    const slice = rows.slice(0, limit);
    const ctx = await this.loadContext(slice.map((r) => r.id));
    const last = slice[slice.length - 1];
    return {
      items: slice.map((r) => toItemCard(ctx.get(r.id)!, this.media, viewerId)),
      nextCursor:
        rows.length > limit && last
          ? encodeCursor({ ts: last.createdAt.toISOString(), id: last.id })
          : null,
    };
  }

  async suggest(q: string, locale: 'ru' | 'ky' | 'en'): Promise<string[]> {
    const variants = queryVariants(q);
    if (!variants.length) return [];
    const cats = await this.db.select().from(categories).where(eq(categories.active, true));
    const out = new Set<string>();
    for (const c of cats) {
      const names = [c.nameRu, c.nameKy, c.nameEn ?? '', ...c.synonyms].map(normalizeSearchText);
      if (variants.some((v) => names.some((n) => n.startsWith(v) || n.includes(v))))
        out.add(locale === 'ky' ? c.nameKy : locale === 'en' ? (c.nameEn ?? c.nameRu) : c.nameRu);
    }
    const rows = await this.db
      .select({ title: items.title })
      .from(items)
      .where(
        and(
          eq(items.listingStatus, 'PUBLISHED'),
          or(...variants.map((v) => sql`${items.searchText} ILIKE ${'%' + v + '%'}`)),
        ),
      )
      .orderBy(desc(items.createdAt))
      .limit(8);
    for (const r of rows) out.add(r.title);
    return [...out].slice(0, 10);
  }

  private async locationWithChildren(locationId: string): Promise<string[]> {
    const rows = await this.db
      .select({ id: locations.id, parentId: locations.parentId })
      .from(locations);
    const ids = new Set<string>([locationId]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const r of rows) {
        if (r.parentId && ids.has(r.parentId) && !ids.has(r.id)) {
          ids.add(r.id);
          changed = true;
        }
      }
    }
    return [...ids];
  }

  // ---------- detail ----------

  async detail(itemId: string, viewer?: User): Promise<ItemDetail> {
    const ctx = (await this.loadContext([itemId])).get(itemId);
    if (!ctx) throw AppError.notFound();
    const isOwner = viewer?.id === ctx.item.ownerAccountId;
    if (!isOwner && !PUBLIC_STATUSES.includes(ctx.item.listingStatus as any)) {
      // Distinguish "removed" from "not yet available" for the client's state machine.
      throw new AppError('item.not_published', 404, {
        state: ctx.item.listingStatus === 'REMOVED' ? 'content_removed' : 'item_unavailable',
      });
    }
    const card: ItemDetail = toItemCard(ctx, this.media, viewer?.id);
    if (isOwner) {
      const [priv] = await this.db
        .select()
        .from(itemPrivateDetails)
        .where(eq(itemPrivateDetails.itemId, itemId));
      card.hiddenFeatures = priv?.protectedAttributes.hiddenFeatures ?? [];
      card.contactPhone = priv?.protectedAttributes.contactPhone || null;
      card.moderationNote = ctx.item.moderationNote;
      card.aiAssisted = ctx.item.aiAssisted;
    }
    return card;
  }

  // ---------- create / update ----------

  private async buildSearchText(
    title: string,
    description: string,
    brand: string | null,
    color: string | null,
    categoryId: string,
  ) {
    const [cat] = await this.db.select().from(categories).where(eq(categories.id, categoryId));
    return normalizeSearchText(
      [
        title,
        description,
        brand ?? '',
        color ?? '',
        cat?.nameRu ?? '',
        cat?.nameKy ?? '',
        ...(cat?.synonyms ?? []),
      ].join(' '),
    );
  }

  /**
   * Decide PUBLISHED vs PENDING_REVIEW from media safety results (PRD §10 step 9).
   * `review` = a moderator should look at the photos: before publication
   * (PHOTO_REVIEW=before) or after it, with the listing already live (PHOTO_REVIEW=after).
   */
  private decidePublishStatus(mediaStatuses: string[]): {
    status: 'PUBLISHED' | 'PENDING_REVIEW';
    review: boolean;
  } {
    const review = mediaStatuses.some((s) => s === 'READY_UNCHECKED');
    const status = review && this.cfg.photoReview === 'before' ? 'PENDING_REVIEW' : 'PUBLISHED';
    return { status, review };
  }

  /** Opens a review case for the item unless one is already waiting. */
  private async openReviewCase(itemId: string, userId: string) {
    const [open] = await this.db
      .select({ id: moderationCases.id })
      .from(moderationCases)
      .where(
        and(
          eq(moderationCases.itemId, itemId),
          eq(moderationCases.kind, 'item_review'),
          eq(moderationCases.status, 'OPEN'),
        ),
      );
    if (!open) await this.db.insert(moderationCases).values({ kind: 'item_review', itemId, userId });
  }

  async create(
    owner: User,
    dto: CreateItemDto,
    idempotencyKey?: string,
  ): Promise<{ item: ItemDetail; matchesCount: number }> {
    if (idempotencyKey) {
      const [existing] = await this.db
        .select()
        .from(idempotencyKeys)
        .where(
          and(
            eq(idempotencyKeys.userId, owner.id),
            eq(idempotencyKeys.scope, 'items.create'),
            eq(idempotencyKeys.key, idempotencyKey),
          ),
        );
      if (existing) return existing.responseJson as { item: ItemDetail; matchesCount: number };
    }
    const [cat] = await this.db
      .select()
      .from(categories)
      .where(and(eq(categories.id, dto.categoryId), eq(categories.active, true)));
    if (!cat) throw AppError.badRequest('error.validation', { field: 'categoryId' });
    if (dto.approximateLocationId) {
      const [loc] = await this.db
        .select()
        .from(locations)
        .where(eq(locations.id, dto.approximateLocationId));
      if (!loc) throw AppError.badRequest('error.validation', { field: 'approximateLocationId' });
    }
    const phone = contactPhone(dto.contactPhone);
    const publish = dto.publish !== false;
    if (publish && dto.acceptRules !== true)
      throw AppError.badRequest('error.validation', { field: 'acceptRules' });

    const title = clampText(dto.title, 80);
    const description = clampText(dto.description, 1500);
    const textIssue = scanListingText([title, description, dto.brand], dto.listingType);
    if (textIssue) throw AppError.badRequest(textIssue);
    const searchText = await this.buildSearchText(
      title,
      description,
      dto.brand ?? null,
      dto.color ?? null,
      cat.id,
    );
    const start = dto.eventTimeStart ? new Date(dto.eventTimeStart) : null;
    const end = dto.eventTimeEnd ? new Date(dto.eventTimeEnd) : start;

    const [item] = await this.db
      .insert(items)
      .values({
        ownerAccountId: owner.id,
        listingType: dto.listingType,
        categoryId: cat.id,
        title,
        descriptionPublic: description,
        color: dto.color ?? null,
        brand: clampText(dto.brand, 60) || null,
        size: clampText(dto.size, 30) || null,
        approximateLocationId: dto.approximateLocationId ?? null,
        eventTimeStart: start,
        eventTimeEnd: end,
        listingStatus: 'DRAFT',
        rewardAmount: dto.listingType === 'LOST' ? (dto.reward?.amount ?? null) : null,
        rewardNote: dto.listingType === 'LOST' ? clampText(dto.reward?.note, 120) || null : null,
        aiAssisted: Boolean(dto.aiAssisted),
        searchText,
      })
      .returning();

    await this.db.insert(itemPrivateDetails).values({
      itemId: item.id,
      protectedAttributes: {
        hiddenFeatures: (dto.hiddenFeatures ?? []).map((h) => clampText(h, 200)).filter(Boolean),
        ...(phone ? { contactPhone: phone } : {}),
      },
    });

    const attached = dto.mediaIds?.length
      ? await this.media.attach(dto.mediaIds, item.id, owner.id)
      : [];
    let matchesCount = 0;
    if (publish)
      matchesCount = await this.publish(
        item,
        attached.map((m) => m.processingStatus),
      );

    const detail = await this.detail(item.id, owner);
    const response = { item: detail, matchesCount };
    if (idempotencyKey) {
      await this.db
        .insert(idempotencyKeys)
        .values({
          userId: owner.id,
          scope: 'items.create',
          key: idempotencyKey,
          responseJson: response,
        })
        .onConflictDoNothing();
    }
    await this.audit.log({
      actorType: 'user',
      actorId: owner.id,
      action: 'item.created',
      targetType: 'item',
      targetId: item.id,
    });
    return response;
  }

  private async publish(item: Item, mediaStatuses: string[]): Promise<number> {
    const { status, review } = this.decidePublishStatus(mediaStatuses);
    const now = new Date();
    const [updated] = await this.db
      .update(items)
      .set({
        listingStatus: status,
        publishedAt: status === 'PUBLISHED' ? now : null,
        updatedAt: now,
      })
      .where(eq(items.id, item.id))
      .returning();
    if (review) await this.openReviewCase(item.id, item.ownerAccountId);
    if (status === 'PENDING_REVIEW') return 0;
    try {
      return await this.matching.onItemPublished(updated);
    } catch (e) {
      this.logger.warn(`matching failed for ${item.id}: ${(e as Error).message}`);
      return 0;
    }
  }

  async update(owner: User, itemId: string, dto: UpdateItemDto): Promise<ItemDetail> {
    const [item] = await this.db.select().from(items).where(eq(items.id, itemId));
    if (!item) throw AppError.notFound();
    if (item.ownerAccountId !== owner.id) throw AppError.forbidden();
    if (!['DRAFT', 'PENDING_REVIEW', 'PUBLISHED'].includes(item.listingStatus))
      throw AppError.badRequest('item.status_transition_invalid');

    const patch: Partial<typeof items.$inferInsert> = { updatedAt: new Date() };
    if (dto.categoryId) {
      const [cat] = await this.db
        .select()
        .from(categories)
        .where(eq(categories.id, dto.categoryId));
      if (!cat) throw AppError.badRequest('error.validation', { field: 'categoryId' });
      patch.categoryId = cat.id;
    }
    if (dto.title !== undefined) patch.title = clampText(dto.title, 80);
    if (dto.description !== undefined) patch.descriptionPublic = clampText(dto.description, 1500);
    if (dto.color !== undefined) patch.color = dto.color;
    if (dto.brand !== undefined) patch.brand = dto.brand ? clampText(dto.brand, 60) : null;
    if (dto.size !== undefined) patch.size = dto.size ? clampText(dto.size, 30) : null;
    if (dto.approximateLocationId !== undefined)
      patch.approximateLocationId = dto.approximateLocationId;
    if (dto.eventTimeStart !== undefined)
      patch.eventTimeStart = dto.eventTimeStart ? new Date(dto.eventTimeStart) : null;
    if (dto.eventTimeEnd !== undefined)
      patch.eventTimeEnd = dto.eventTimeEnd ? new Date(dto.eventTimeEnd) : null;
    if (dto.reward !== undefined && item.listingType === 'LOST') {
      patch.rewardAmount = dto.reward?.amount ?? null;
      patch.rewardNote = dto.reward?.note ? clampText(dto.reward.note, 120) : null;
    }
    const textIssue = scanListingText([patch.title, patch.descriptionPublic, patch.brand], item.listingType);
    if (textIssue) throw AppError.badRequest(textIssue);
    const merged = { ...item, ...patch } as Item;
    patch.searchText = await this.buildSearchText(
      merged.title,
      merged.descriptionPublic,
      merged.brand,
      merged.color,
      merged.categoryId,
    );
    const [updated] = await this.db
      .update(items)
      .set(patch)
      .where(eq(items.id, itemId))
      .returning();

    const phone = contactPhone(dto.contactPhone);
    if (dto.hiddenFeatures || phone !== undefined) {
      // Merge, so editing one private field never wipes the other.
      const [priv] = await this.db
        .select()
        .from(itemPrivateDetails)
        .where(eq(itemPrivateDetails.itemId, itemId));
      const next = { ...(priv?.protectedAttributes ?? { hiddenFeatures: [] }) };
      if (dto.hiddenFeatures)
        next.hiddenFeatures = dto.hiddenFeatures.map((h) => clampText(h, 200)).filter(Boolean);
      if (phone === '') delete next.contactPhone;
      else if (phone) next.contactPhone = phone;
      await this.db
        .update(itemPrivateDetails)
        .set({ protectedAttributes: next })
        .where(eq(itemPrivateDetails.itemId, itemId));
    }
    let mediaStatuses: string[] | null = null;
    if (dto.mediaIds)
      mediaStatuses = (await this.media.attach(dto.mediaIds, itemId, owner.id)).map(
        (m) => m.processingStatus,
      );

    if (dto.publish && item.listingStatus === 'DRAFT') {
      const statuses =
        mediaStatuses ?? (await this.media.getForItem(itemId)).map((m) => m.processingStatus);
      await this.publish(updated, statuses);
    } else if (
      item.listingStatus === 'PUBLISHED' &&
      mediaStatuses?.some((s) => s === 'READY_UNCHECKED')
    ) {
      // New unchecked photo on a live listing → a moderator looks at it; with
      // PHOTO_REVIEW=before the listing is hidden until then.
      if (this.cfg.photoReview === 'before')
        await this.db
          .update(items)
          .set({ listingStatus: 'PENDING_REVIEW' })
          .where(eq(items.id, itemId));
      await this.openReviewCase(itemId, owner.id);
    }
    await this.audit.log({
      actorType: 'user',
      actorId: owner.id,
      action: 'item.updated',
      targetType: 'item',
      targetId: itemId,
    });
    return this.detail(itemId, owner);
  }

  async close(owner: User, itemId: string, resolution: 'resolved' | 'closed'): Promise<ItemDetail> {
    const [item] = await this.db.select().from(items).where(eq(items.id, itemId));
    if (!item) throw AppError.notFound();
    if (item.ownerAccountId !== owner.id) throw AppError.forbidden();
    if (!['DRAFT', 'PENDING_REVIEW', 'PUBLISHED'].includes(item.listingStatus))
      throw AppError.badRequest('item.status_transition_invalid');
    const now = new Date();
    await this.db
      .update(items)
      .set({
        listingStatus: resolution === 'resolved' ? 'RESOLVED' : 'CLOSED',
        closedAt: now,
        updatedAt: now,
      })
      .where(eq(items.id, itemId));
    await this.audit.log({
      actorType: 'user',
      actorId: owner.id,
      action: `item.${resolution}`,
      targetType: 'item',
      targetId: itemId,
    });
    return this.detail(itemId, owner);
  }

  async remove(owner: User, itemId: string): Promise<void> {
    const [item] = await this.db.select().from(items).where(eq(items.id, itemId));
    if (!item) throw AppError.notFound();
    if (item.ownerAccountId !== owner.id) throw AppError.forbidden();
    await this.db
      .update(items)
      .set({ listingStatus: 'CLOSED', closedAt: new Date(), updatedAt: new Date() })
      .where(eq(items.id, itemId));
    await this.audit.log({
      actorType: 'user',
      actorId: owner.id,
      action: 'item.deleted',
      targetType: 'item',
      targetId: itemId,
    });
  }

  async mine(owner: User, status?: string): Promise<ItemCard[]> {
    const conds: SQL[] = [eq(items.ownerAccountId, owner.id)];
    if (status) conds.push(eq(items.listingStatus, status as Item['listingStatus']));
    const rows = await this.db
      .select({ id: items.id })
      .from(items)
      .where(and(...conds))
      .orderBy(desc(items.createdAt))
      .limit(100);
    const ctx = await this.loadContext(rows.map((r) => r.id));
    return rows.map((r) => toItemCard(ctx.get(r.id)!, this.media, owner.id));
  }

  /** Items of a user that have at least one active claim — used by the "requests" profile section. */
  async withClaimsCount(ownerId: string): Promise<Record<string, number>> {
    const rows = await this.db
      .select({ itemId: claims.itemId, count: sql<number>`count(*)::int` })
      .from(claims)
      .innerJoin(items, eq(items.id, claims.itemId))
      .where(
        and(
          eq(items.ownerAccountId, ownerId),
          inArray(claims.status, [
            'SUBMITTED',
            'SCREENING',
            'NEEDS_MORE_INFORMATION',
            'UNDER_REVIEW',
          ]),
        ),
      )
      .groupBy(claims.itemId);
    return Object.fromEntries(rows.map((r) => [r.itemId, r.count]));
  }

  async getOwned(itemId: string, ownerId: string): Promise<Item> {
    const [item] = await this.db.select().from(items).where(eq(items.id, itemId));
    if (!item) throw AppError.notFound();
    if (item.ownerAccountId !== ownerId) throw AppError.forbidden();
    return item;
  }
}
