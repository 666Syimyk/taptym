import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gt, inArray, sql } from 'drizzle-orm';
import { DB, type AppDb } from '../../database/database.module';
import {
  categories,
  claimEvidence,
  claims,
  itemMedia,
  itemPrivateDetails,
  items,
  moderationCases,
  users,
  type Claim,
  type User,
} from '../../database/schema';
import { AppError } from '../../common/errors';
import { type Locale, t } from '../../common/i18n';
import { clampText } from '../../common/text';
import { NotificationsService } from '../notifications/notifications.service';
import { MessagingService } from '../messaging/messaging.service';
import { RiskService } from '../risk/risk.service';
import { AuditService } from '../audit/audit.service';
import { MediaService } from '../media/media.service';
import type { ClaimDecisionDto, CreateClaimDto, EvidenceDto } from './claims.dto';

const ACTIVE = [
  'SUBMITTED',
  'SCREENING',
  'NEEDS_MORE_INFORMATION',
  'UNDER_REVIEW',
  'PLAUSIBLE',
  'APPROVED_FOR_HANDOFF',
] as const;
/** From these states on, the claimant may call the listing author directly. */
const PHONE_VISIBLE = ['PLAUSIBLE', 'APPROVED_FOR_HANDOFF', 'COMPLETED'];
const MAX_CLAIMS_PER_DAY = 5;
const MAX_CLAIMS_PER_ITEM = 2;
const MAX_EVIDENCE_ROUNDS = 3;

export interface ClaimView {
  id: string;
  itemId: string;
  itemTitle: string;
  itemType: 'LOST' | 'FOUND';
  kind: 'OWNERSHIP' | 'FOUND_REPORT';
  status: Claim['status'];
  message: string | null;
  decisionNote: string | null;
  claimant: { id: string; publicName: string };
  isClaimant: boolean;
  isItemOwner: boolean;
  /** Listing author's phone — only for the claimant, and only after approval. */
  contactPhone: string | null;
  evidence: {
    id: string;
    type: string;
    text: string | null;
    hasAttachment: boolean;
    attachmentUrl: string | null;
    createdAt: string;
  }[];
  conversationId: string | null;
  submittedAt: string;
  updatedAt: string;
  intro: string;
}

@Injectable()
export class ClaimsService {
  constructor(
    @Inject(DB) private readonly db: AppDb,
    private readonly notifications: NotificationsService,
    private readonly messaging: MessagingService,
    private readonly risk: RiskService,
    private readonly audit: AuditService,
    private readonly media: MediaService,
  ) {}

  async create(
    claimant: User,
    itemId: string,
    dto: CreateClaimDto,
    locale: Locale,
  ): Promise<ClaimView> {
    const [item] = await this.db.select().from(items).where(eq(items.id, itemId));
    if (!item || item.listingStatus !== 'PUBLISHED') throw AppError.notFound('item.not_published');
    if (item.ownerAccountId === claimant.id) throw AppError.badRequest('item.cannot_claim_own');
    await this.validateEvidence(claimant.id, dto.evidence);

    // Anti-brute-force limits (PRD §13.4).
    const since = new Date(Date.now() - 86_400_000);
    const [{ daily }] = await this.db
      .select({ daily: sql<number>`count(*)::int` })
      .from(claims)
      .where(and(eq(claims.claimantId, claimant.id), gt(claims.submittedAt, since)));
    if (daily >= MAX_CLAIMS_PER_DAY) {
      await this.risk.record(claimant.id, 'claim_rate_limit_hit', 2, { itemId });
      throw AppError.tooMany('claim.limit_reached');
    }
    const mineOnItem = await this.db
      .select()
      .from(claims)
      .where(and(eq(claims.itemId, itemId), eq(claims.claimantId, claimant.id)));
    if (mineOnItem.some((c) => (ACTIVE as readonly string[]).includes(c.status)))
      throw AppError.conflict('claim.duplicate_active');
    if (mineOnItem.length >= MAX_CLAIMS_PER_ITEM) throw AppError.tooMany('claim.limit_reached');

    const [cat] = await this.db.select().from(categories).where(eq(categories.id, item.categoryId));
    const kind = item.listingType === 'FOUND' ? 'OWNERSHIP' : 'FOUND_REPORT';
    const riskState = cat?.sensitive ? 'ELEVATED' : 'NORMAL';

    const [claim] = await this.db
      .insert(claims)
      .values({
        itemId,
        claimantId: claimant.id,
        kind,
        status: 'SUBMITTED',
        riskState,
        message: clampText(dto.message, 400) || null,
      })
      .returning();
    await this.addEvidenceRows(claim.id, claimant.id, dto.evidence);
    if (riskState === 'ELEVATED') {
      // Valuable / sensitive categories get a moderator in the loop in parallel (PRD §13.5).
      await this.db.insert(moderationCases).values({
        kind: 'claim_dispute',
        claimId: claim.id,
        itemId,
        userId: claimant.id,
        status: 'OPEN',
        resolution: null,
      });
    }
    await this.notifications.notify(
      item.ownerAccountId,
      'CLAIM_RECEIVED',
      { title: item.title },
      `tabyldy://claims/${claim.id}`,
    );
    await this.audit.log({
      actorType: 'user',
      actorId: claimant.id,
      action: 'claim.submitted',
      targetType: 'claim',
      targetId: claim.id,
    });
    return this.view(claim.id, claimant, locale);
  }

  private async validateEvidence(claimantId: string, evidence: EvidenceDto[]) {
    if (!evidence?.some((e) => e.text?.trim() || e.mediaId))
      throw AppError.badRequest('claim.evidence_required');
    for (const e of evidence) {
      if (!e.mediaId) continue;
      const [m] = await this.db.select().from(itemMedia).where(eq(itemMedia.id, e.mediaId));
      if (!m || m.uploaderId !== claimantId) throw AppError.badRequest('item.media_not_owned');
      if (!['READY', 'READY_UNCHECKED', 'BLOCKED_SENSITIVE'].includes(m.processingStatus))
        throw AppError.badRequest('item.media_not_ready');
      if (!m.protectedVariantKey) throw AppError.badRequest('item.media_not_ready');
    }
  }

  private async addEvidenceRows(claimId: string, claimantId: string, evidence: EvidenceDto[]) {
    for (const e of evidence) {
      let ref: string | null = null;
      if (e.mediaId) {
        const [m] = await this.db.select().from(itemMedia).where(eq(itemMedia.id, e.mediaId));
        if (!m || m.uploaderId !== claimantId) throw AppError.badRequest('item.media_not_owned');
        ref = e.mediaId;
      }
      if (!e.text && !ref) continue;
      await this.db.insert(claimEvidence).values({
        claimId,
        evidenceType: e.type,
        textContent: clampText(e.text, 600) || null,
        protectedStorageReference: ref,
        retentionDeadline: new Date(Date.now() + 180 * 86_400_000),
      });
    }
  }

  async addEvidence(
    claimant: User,
    claimId: string,
    evidence: EvidenceDto[],
    locale: Locale,
  ): Promise<ClaimView> {
    const claim = await this.get(claimId);
    if (claim.claimantId !== claimant.id) throw AppError.forbidden();
    if (!['SUBMITTED', 'NEEDS_MORE_INFORMATION'].includes(claim.status))
      throw AppError.badRequest('item.status_transition_invalid');
    await this.validateEvidence(claimant.id, evidence);
    const [{ rounds }] = await this.db
      .select({ rounds: sql<number>`count(*)::int` })
      .from(claimEvidence)
      .where(eq(claimEvidence.claimId, claimId));
    if (rounds >= MAX_EVIDENCE_ROUNDS * 5) {
      await this.risk.record(claimant.id, 'claim_evidence_flood', 2, { claimId });
      throw AppError.tooMany('claim.limit_reached');
    }
    await this.addEvidenceRows(claimId, claimant.id, evidence);
    await this.db
      .update(claims)
      .set({ status: 'SUBMITTED', updatedAt: new Date() })
      .where(eq(claims.id, claimId));
    const [item] = await this.db.select().from(items).where(eq(items.id, claim.itemId));
    if (item)
      await this.notifications.notify(
        item.ownerAccountId,
        'CLAIM_RECEIVED',
        { title: item.title },
        `tabyldy://claims/${claimId}`,
      );
    return this.view(claimId, claimant, locale);
  }

  async withdraw(claimant: User, claimId: string, locale: Locale): Promise<ClaimView> {
    const claim = await this.get(claimId);
    if (claim.claimantId !== claimant.id) throw AppError.forbidden();
    if (!(ACTIVE as readonly string[]).includes(claim.status))
      throw AppError.badRequest('item.status_transition_invalid');
    await this.db
      .update(claims)
      .set({ status: 'WITHDRAWN', closedAt: new Date(), updatedAt: new Date() })
      .where(eq(claims.id, claimId));
    return this.view(claimId, claimant, locale);
  }

  /** Item owner decision. The owner never sees the claimant's contacts; a chat opens only on "plausible". */
  async decide(
    owner: User,
    claimId: string,
    dto: ClaimDecisionDto,
    locale: Locale,
  ): Promise<ClaimView> {
    const claim = await this.get(claimId);
    const [item] = await this.db.select().from(items).where(eq(items.id, claim.itemId));
    if (!item) throw AppError.notFound();
    if (item.ownerAccountId !== owner.id) throw AppError.forbidden();
    if (!(ACTIVE as readonly string[]).includes(claim.status))
      throw AppError.badRequest('item.status_transition_invalid');

    const now = new Date();
    const note = clampText(dto.note, 400) || null;
    switch (dto.decision) {
      case 'needs_more_information':
        await this.db
          .update(claims)
          .set({
            status: 'NEEDS_MORE_INFORMATION',
            decisionNote: note,
            reviewedAt: now,
            updatedAt: now,
          })
          .where(eq(claims.id, claimId));
        await this.notifications.notify(
          claim.claimantId,
          'CLAIM_NEEDS_INFO',
          { title: item.title },
          `tabyldy://claims/${claimId}`,
        );
        break;
      case 'rejected':
        await this.db
          .update(claims)
          .set({
            status: 'REJECTED',
            decisionNote: note,
            reviewedAt: now,
            closedAt: now,
            updatedAt: now,
          })
          .where(eq(claims.id, claimId));
        await this.notifications.notify(
          claim.claimantId,
          'CLAIM_REJECTED',
          { title: item.title },
          `tabyldy://claims/${claimId}`,
        );
        await this.risk.record(claim.claimantId, 'claim_rejected', 2, { claimId });
        break;
      case 'plausible': {
        await this.db
          .update(claims)
          .set({ status: 'PLAUSIBLE', decisionNote: note, reviewedAt: now, updatedAt: now })
          .where(eq(claims.id, claimId));
        // Finder = whoever physically holds the item.
        const finderId = item.listingType === 'FOUND' ? owner.id : claim.claimantId;
        const loserId = item.listingType === 'FOUND' ? claim.claimantId : owner.id;
        await this.messaging.openForClaim(item.id, claimId, finderId, loserId, locale);
        await this.notifications.notify(
          claim.claimantId,
          'CLAIM_APPROVED',
          { title: item.title },
          `tabyldy://claims/${claimId}`,
        );
        break;
      }
      case 'approve_handoff':
        if (!['PLAUSIBLE'].includes(claim.status))
          throw AppError.badRequest('claim.decision_invalid');
        await this.db
          .update(claims)
          .set({
            status: 'APPROVED_FOR_HANDOFF',
            decisionNote: note,
            reviewedAt: now,
            updatedAt: now,
          })
          .where(eq(claims.id, claimId));
        break;
      default:
        throw AppError.badRequest('claim.decision_invalid');
    }
    await this.audit.log({
      actorType: 'user',
      actorId: owner.id,
      action: `claim.${dto.decision}`,
      targetType: 'claim',
      targetId: claimId,
    });
    return this.view(claimId, owner, locale);
  }

  async dispute(user: User, claimId: string, locale: Locale): Promise<ClaimView> {
    const claim = await this.get(claimId);
    const [item] = await this.db.select().from(items).where(eq(items.id, claim.itemId));
    if (!item || (claim.claimantId !== user.id && item.ownerAccountId !== user.id))
      throw AppError.forbidden();
    await this.db
      .update(claims)
      .set({ status: 'UNDER_REVIEW', updatedAt: new Date() })
      .where(eq(claims.id, claimId));
    await this.db
      .insert(moderationCases)
      .values({ kind: 'claim_dispute', claimId, itemId: item.id, userId: user.id });
    return this.view(claimId, user, locale);
  }

  async get(claimId: string): Promise<Claim> {
    const [claim] = await this.db.select().from(claims).where(eq(claims.id, claimId));
    if (!claim) throw AppError.notFound();
    return claim;
  }

  /** Access control: only the claimant and the item owner may read a claim (test 6). */
  async view(claimId: string, viewer: User, locale: Locale): Promise<ClaimView> {
    const claim = await this.get(claimId);
    const [item] = await this.db.select().from(items).where(eq(items.id, claim.itemId));
    if (!item) throw AppError.notFound();
    const isClaimant = claim.claimantId === viewer.id;
    const isItemOwner = item.ownerAccountId === viewer.id;
    if (!isClaimant && !isItemOwner) throw AppError.notFound(); // do not reveal existence
    const [claimant] = await this.db
      .select({ id: users.id, publicName: users.publicName })
      .from(users)
      .where(eq(users.id, claim.claimantId));
    const evidence = await this.db
      .select()
      .from(claimEvidence)
      .where(eq(claimEvidence.claimId, claimId))
      .orderBy(claimEvidence.createdAt);
    const mediaIds = evidence.map((e) => e.protectedStorageReference).filter(Boolean) as string[];
    let contactPhone: string | null = null;
    if (isClaimant && PHONE_VISIBLE.includes(claim.status)) {
      const [priv] = await this.db
        .select()
        .from(itemPrivateDetails)
        .where(eq(itemPrivateDetails.itemId, item.id));
      contactPhone = priv?.protectedAttributes.contactPhone ?? null;
    }
    const media = mediaIds.length
      ? await this.db.select().from(itemMedia).where(inArray(itemMedia.id, mediaIds))
      : [];
    return {
      id: claim.id,
      itemId: item.id,
      itemTitle: item.title,
      itemType: item.listingType,
      kind: claim.kind,
      status: claim.status,
      message: claim.message,
      decisionNote: claim.decisionNote,
      claimant: { id: claimant.id, publicName: claimant.publicName },
      isClaimant,
      isItemOwner,
      contactPhone,
      evidence: evidence.map((e) => {
        const m = e.protectedStorageReference
          ? media.find((x) => x.id === e.protectedStorageReference)
          : undefined;
        return {
          id: e.id,
          type: e.evidenceType,
          text: e.textContent,
          hasAttachment: Boolean(e.protectedStorageReference),
          // Evidence photos are served through the protected contour with a short-lived link.
          attachmentUrl: m?.protectedVariantKey
            ? this.media.signProtectedLink(m.protectedVariantKey)
            : m?.publicVariantKey
              ? this.media.view(m, true).publicUrl
              : null,
          createdAt: e.createdAt.toISOString(),
        };
      }),
      conversationId: await this.messaging.conversationIdForClaim(claimId),
      submittedAt: claim.submittedAt.toISOString(),
      updatedAt: claim.updatedAt.toISOString(),
      intro: t('claim.intro', locale),
    };
  }

  async listMine(user: User, locale: Locale): Promise<ClaimView[]> {
    const rows = await this.db
      .select({ id: claims.id })
      .from(claims)
      .where(eq(claims.claimantId, user.id))
      .orderBy(desc(claims.submittedAt))
      .limit(50);
    return Promise.all(rows.map((r) => this.view(r.id, user, locale)));
  }

  async listForItem(owner: User, itemId: string, locale: Locale): Promise<ClaimView[]> {
    const [item] = await this.db.select().from(items).where(eq(items.id, itemId));
    if (!item) throw AppError.notFound();
    if (item.ownerAccountId !== owner.id) throw AppError.forbidden();
    const rows = await this.db
      .select({ id: claims.id })
      .from(claims)
      .where(eq(claims.itemId, itemId))
      .orderBy(desc(claims.submittedAt));
    return Promise.all(rows.map((r) => this.view(r.id, owner, locale)));
  }

  /** Incoming claims on all items I own (profile → "Заявки"). */
  async listIncoming(owner: User, locale: Locale): Promise<ClaimView[]> {
    const rows = await this.db
      .select({ id: claims.id })
      .from(claims)
      .innerJoin(items, eq(items.id, claims.itemId))
      .where(eq(items.ownerAccountId, owner.id))
      .orderBy(desc(claims.submittedAt))
      .limit(50);
    return Promise.all(rows.map((r) => this.view(r.id, owner, locale)));
  }
}
