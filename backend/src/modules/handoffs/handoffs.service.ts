import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DB, type AppDb } from '../../database/database.module';
import {
  claims,
  handoffs,
  items,
  moderationCases,
  trustEvents,
  users,
  type User,
} from '../../database/schema';
import { AppError } from '../../common/errors';
import { type Locale, t } from '../../common/i18n';
import { randomNumericCode, safeEqualHex, sha256Hex } from '../../common/crypto';
import { clampText } from '../../common/text';
import { MessagingService } from '../messaging/messaging.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';

export interface HandoffView {
  id: string;
  itemId: string;
  itemTitle: string;
  claimId: string;
  state: string;
  method: string;
  placeNote: string | null;
  /** Roles relative to the viewer */
  myRole: 'holder' | 'receiver';
  iConfirmed: boolean;
  otherConfirmed: boolean;
  /** One-time confirmation code, shown only to the holder while pending (P1 shows it as QR). */
  confirmationCode?: string;
  expiresAt: string | null;
  completedAt: string | null;
  disclaimer: string;
}

const TOKEN_TTL_MS = 72 * 3_600_000;

/**
 * Safe return flow (PRD §15). The handoff completes when both sides confirm in-app, or
 * when the receiver enters the holder's one-time code. Completion closes the listing.
 * The code proves the in-app procedure happened — never ownership or physical transfer.
 */
@Injectable()
export class HandoffsService {
  constructor(
    @Inject(DB) private readonly db: AppDb,
    private readonly messaging: MessagingService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  private async roles(claimId: string) {
    const [claim] = await this.db.select().from(claims).where(eq(claims.id, claimId));
    if (!claim) throw AppError.notFound();
    const [item] = await this.db.select().from(items).where(eq(items.id, claim.itemId));
    if (!item) throw AppError.notFound();
    const holderId = item.listingType === 'FOUND' ? item.ownerAccountId : claim.claimantId;
    const receiverId = item.listingType === 'FOUND' ? claim.claimantId : item.ownerAccountId;
    return { claim, item, holderId, receiverId };
  }

  async create(
    user: User,
    claimId: string,
    method: 'meeting' | 'other',
    placeNote: string | undefined,
    locale: Locale,
  ): Promise<HandoffView> {
    const { claim, item, holderId, receiverId } = await this.roles(claimId);
    if (user.id !== holderId && user.id !== receiverId) throw AppError.forbidden();
    if (!['PLAUSIBLE', 'APPROVED_FOR_HANDOFF'].includes(claim.status))
      throw AppError.badRequest('handoff.not_approved');
    const [existing] = await this.db
      .select()
      .from(handoffs)
      .where(and(eq(handoffs.claimId, claimId), eq(handoffs.confirmationState, 'PENDING')));
    if (existing) return this.view(existing.id, user, locale);

    const code = randomNumericCode(6);
    const [row] = await this.db
      .insert(handoffs)
      .values({
        itemId: item.id,
        claimId,
        method,
        placeNote: clampText(placeNote, 200) || null,
        handoffTokenHash: sha256Hex(`${claimId}:${code}`),
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      })
      .returning();
    await this.db
      .update(claims)
      .set({ status: 'APPROVED_FOR_HANDOFF', updatedAt: new Date() })
      .where(eq(claims.id, claimId));
    const convId = await this.messaging.conversationIdForClaim(claimId);
    if (convId)
      await this.messaging.system(convId, t('chat.system.handoff_proposed', locale), 'handoff');
    await this.audit.log({
      actorType: 'user',
      actorId: user.id,
      action: 'handoff.created',
      targetType: 'handoff',
      targetId: row.id,
    });
    // The code is only ever returned to the holder.
    const v = await this.view(row.id, user, locale);
    return user.id === holderId ? { ...v, confirmationCode: code } : v;
  }

  /**
   * Confirm from one side. With `code`, the receiver proves the holder's one-time code
   * (single use, expiring) which counts as the holder's confirmation too (test 13).
   */
  async confirm(
    user: User,
    handoffId: string,
    code: string | undefined,
    locale: Locale,
  ): Promise<HandoffView> {
    const [h] = await this.db.select().from(handoffs).where(eq(handoffs.id, handoffId));
    if (!h) throw AppError.notFound();
    const { holderId, receiverId, item, claim } = await this.roles(h.claimId);
    if (user.id !== holderId && user.id !== receiverId) throw AppError.forbidden();
    if (['COMPLETED', 'CANCELLED', 'DISPUTED'].includes(h.confirmationState))
      throw AppError.badRequest('item.status_transition_invalid');

    let state = h.confirmationState;
    const isHolder = user.id === holderId;
    if (code) {
      if (!isHolder) {
        if (
          h.tokenUsedAt ||
          !h.expiresAt ||
          h.expiresAt.getTime() < Date.now() ||
          !h.handoffTokenHash
        )
          throw AppError.badRequest('handoff.token_invalid');
        if (!safeEqualHex(h.handoffTokenHash, sha256Hex(`${h.claimId}:${code.trim()}`)))
          throw AppError.badRequest('handoff.token_invalid');
        await this.db
          .update(handoffs)
          .set({ tokenUsedAt: new Date() })
          .where(eq(handoffs.id, handoffId));
        state = 'COMPLETED';
      }
    }
    if (state !== 'COMPLETED') {
      if (isHolder) state = state === 'OWNER_CONFIRMED' ? 'COMPLETED' : 'FINDER_CONFIRMED';
      else state = state === 'FINDER_CONFIRMED' ? 'COMPLETED' : 'OWNER_CONFIRMED';
    }
    const now = new Date();
    await this.db
      .update(handoffs)
      .set({ confirmationState: state, completedAt: state === 'COMPLETED' ? now : null })
      .where(eq(handoffs.id, handoffId));

    if (state === 'COMPLETED') {
      await this.db
        .update(claims)
        .set({ status: 'COMPLETED', closedAt: now, updatedAt: now })
        .where(eq(claims.id, h.claimId));
      await this.db
        .update(items)
        .set({ listingStatus: 'RESOLVED', closedAt: now, updatedAt: now })
        .where(eq(items.id, item.id));
      for (const uid of [holderId, receiverId]) {
        await this.db
          .insert(trustEvents)
          .values({ userId: uid, kind: 'return_completed', delta: 20 });
        await this.notifications.notify(
          uid,
          'HANDOFF_COMPLETED',
          { title: item.title },
          `tabyldy://items/${item.id}`,
        );
      }
      const convId = await this.messaging.conversationIdForClaim(claim.id);
      if (convId)
        await this.messaging.system(convId, t('chat.system.handoff_completed', locale), 'handoff');
      await this.audit.log({
        actorType: 'user',
        actorId: user.id,
        action: 'handoff.completed',
        targetType: 'handoff',
        targetId: handoffId,
      });
    }
    return this.view(handoffId, user, locale);
  }

  async dispute(user: User, handoffId: string, locale: Locale): Promise<HandoffView> {
    const [h] = await this.db.select().from(handoffs).where(eq(handoffs.id, handoffId));
    if (!h) throw AppError.notFound();
    const { holderId, receiverId } = await this.roles(h.claimId);
    if (user.id !== holderId && user.id !== receiverId) throw AppError.forbidden();
    await this.db
      .update(handoffs)
      .set({ confirmationState: 'DISPUTED' })
      .where(eq(handoffs.id, handoffId));
    await this.db
      .update(claims)
      .set({ status: 'UNDER_REVIEW', updatedAt: new Date() })
      .where(eq(claims.id, h.claimId));
    await this.db
      .insert(moderationCases)
      .values({ kind: 'claim_dispute', claimId: h.claimId, itemId: h.itemId, userId: user.id });
    await this.audit.log({
      actorType: 'user',
      actorId: user.id,
      action: 'handoff.disputed',
      targetType: 'handoff',
      targetId: handoffId,
    });
    return this.view(handoffId, user, locale);
  }

  async view(handoffId: string, viewer: User, locale: Locale): Promise<HandoffView> {
    const [h] = await this.db.select().from(handoffs).where(eq(handoffs.id, handoffId));
    if (!h) throw AppError.notFound();
    const { holderId, receiverId, item } = await this.roles(h.claimId);
    if (viewer.id !== holderId && viewer.id !== receiverId) throw AppError.notFound();
    const isHolder = viewer.id === holderId;
    const holderConfirmed =
      h.confirmationState === 'FINDER_CONFIRMED' || h.confirmationState === 'COMPLETED';
    const receiverConfirmed =
      h.confirmationState === 'OWNER_CONFIRMED' || h.confirmationState === 'COMPLETED';
    return {
      id: h.id,
      itemId: item.id,
      itemTitle: item.title,
      claimId: h.claimId,
      state: h.confirmationState,
      method: h.method,
      placeNote: h.placeNote,
      myRole: isHolder ? 'holder' : 'receiver',
      iConfirmed: isHolder ? holderConfirmed : receiverConfirmed,
      otherConfirmed: isHolder ? receiverConfirmed : holderConfirmed,
      expiresAt: h.expiresAt?.toISOString() ?? null,
      completedAt: h.completedAt?.toISOString() ?? null,
      disclaimer:
        locale === 'ky'
          ? 'Ырастоо коду колдонмодогу жол-жобону тастыктайт, бирок өзү менчик укугун же буюмду физикалык өткөрүп берүүнү далилдебейт.'
          : 'Код подтверждает действие в приложении, но сам по себе не доказывает право собственности или физическую передачу.',
    };
  }

  async forClaim(user: User, claimId: string, locale: Locale): Promise<HandoffView | null> {
    const [h] = await this.db
      .select()
      .from(handoffs)
      .where(eq(handoffs.claimId, claimId))
      .orderBy(handoffs.createdAt);
    if (!h) return null;
    return this.view(h.id, user, locale);
  }

  async userExists(id: string) {
    const [u] = await this.db.select({ id: users.id }).from(users).where(eq(users.id, id));
    return Boolean(u);
  }
}
