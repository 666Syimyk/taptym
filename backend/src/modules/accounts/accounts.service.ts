import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { DB, type AppDb } from '../../database/database.module';
import {
  deviceSessions,
  items,
  trustEvents,
  userBlocks,
  userConsents,
  userContacts,
  users,
  type User,
} from '../../database/schema';
import { AppError } from '../../common/errors';
import { type Locale, t } from '../../common/i18n';
import { AuditService } from '../audit/audit.service';

export type TrustLevel =
  'Guest' | 'ContactVerified' | 'EstablishedAccount' | 'OrganizationVerified';

@Injectable()
export class AccountsService {
  constructor(
    @Inject(DB) private readonly db: AppDb,
    private readonly audit: AuditService,
  ) {}

  /** Trust level is computed from signals, never bought or liked into (PRD §19). */
  async trustLevel(user: User): Promise<TrustLevel> {
    if (user.contactVerificationState !== 'VERIFIED') return 'Guest';
    const ageDays = (Date.now() - user.createdAt.getTime()) / 86_400_000;
    const events = await this.db.select().from(trustEvents).where(eq(trustEvents.userId, user.id));
    const returns = events.filter((e) => e.kind === 'return_completed').length;
    const violations = events.filter((e) => e.kind === 'violation_confirmed').length;
    if (ageDays >= 30 && returns >= 1 && violations === 0) return 'EstablishedAccount';
    return 'ContactVerified';
  }

  async me(user: User) {
    const contacts = await this.db
      .select({ channel: userContacts.channel, destination: userContacts.destination })
      .from(userContacts)
      .where(eq(userContacts.userId, user.id));
    const [{ activeItems }] = await this.db
      .select({ activeItems: sql<number>`count(*)::int` })
      .from(items)
      .where(and(eq(items.ownerAccountId, user.id), eq(items.listingStatus, 'PUBLISHED')));
    return {
      id: user.id,
      publicName: user.publicName,
      locale: user.locale,
      accountStatus: user.accountStatus,
      contactVerificationState: user.contactVerificationState,
      trustLevel: await this.trustLevel(user),
      notificationPrefs: user.notificationPrefs,
      contacts: contacts.map((c) => ({ channel: c.channel, masked: mask(c.destination) })),
      stats: { activeItems },
      createdAt: user.createdAt.toISOString(),
    };
  }

  async update(
    user: User,
    patch: {
      publicName?: string;
      locale?: 'ru' | 'ky' | 'en';
      notificationPrefs?: Record<string, boolean>;
    },
  ) {
    const set: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
    if (patch.publicName !== undefined) set.publicName = patch.publicName.trim();
    if (patch.locale) set.locale = patch.locale;
    if (patch.notificationPrefs) {
      const clean: Record<string, boolean> = {};
      for (const [k, v] of Object.entries(patch.notificationPrefs))
        if (typeof v === 'boolean') clean[k] = v;
      set.notificationPrefs = { ...(user.notificationPrefs ?? {}), ...clean };
    }
    const [updated] = await this.db.update(users).set(set).where(eq(users.id, user.id)).returning();
    return this.me(updated);
  }

  async setPushToken(userId: string, sessionId: string, token: string | null) {
    await this.db
      .update(deviceSessions)
      .set({ pushToken: token, lastSeenAt: new Date() })
      .where(and(eq(deviceSessions.id, sessionId), eq(deviceSessions.userId, userId)));
  }

  async listSessions(userId: string, currentSessionId: string) {
    const rows = await this.db
      .select()
      .from(deviceSessions)
      .where(and(eq(deviceSessions.userId, userId), isNull(deviceSessions.revokedAt)));
    return rows.map((s) => ({
      id: s.id,
      deviceName: s.deviceName,
      platform: s.platform,
      lastSeenAt: s.lastSeenAt.toISOString(),
      current: s.id === currentSessionId,
    }));
  }

  async revokeSession(userId: string, sessionId: string) {
    await this.db
      .update(deviceSessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(deviceSessions.id, sessionId), eq(deviceSessions.userId, userId)));
  }

  async recordConsent(userId: string, consentType: string, version: string, granted: boolean) {
    if (granted) {
      await this.db.insert(userConsents).values({ userId, consentType, version });
    } else {
      await this.db
        .update(userConsents)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(userConsents.userId, userId),
            eq(userConsents.consentType, consentType),
            isNull(userConsents.revokedAt),
          ),
        );
    }
  }

  async block(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) throw AppError.badRequest('error.validation');
    const [target] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, blockedId));
    if (!target) throw AppError.notFound();
    await this.db.insert(userBlocks).values({ blockerId, blockedId }).onConflictDoNothing();
  }

  async unblock(blockerId: string, blockedId: string) {
    await this.db
      .delete(userBlocks)
      .where(and(eq(userBlocks.blockerId, blockerId), eq(userBlocks.blockedId, blockedId)));
  }

  async isBlockedEitherWay(a: string, b: string): Promise<boolean> {
    const rows = await this.db
      .select()
      .from(userBlocks)
      .where(
        sql`(${userBlocks.blockerId} = ${a} AND ${userBlocks.blockedId} = ${b}) OR (${userBlocks.blockerId} = ${b} AND ${userBlocks.blockedId} = ${a})`,
      );
    return rows.length > 0;
  }

  /**
   * Account deletion = anonymization (PRD §17.4, test 12): contacts and sessions are
   * removed, listings are closed, the public name is replaced. Messages stay attached
   * to the anonymized account so the other party keeps their conversation context.
   */
  async deleteAccount(user: User, locale: Locale) {
    const now = new Date();
    await this.db.delete(userContacts).where(eq(userContacts.userId, user.id));
    await this.db
      .update(deviceSessions)
      .set({ revokedAt: now, pushToken: null })
      .where(eq(deviceSessions.userId, user.id));
    await this.db
      .update(items)
      .set({ listingStatus: 'CLOSED', closedAt: now, updatedAt: now })
      .where(
        and(
          eq(items.ownerAccountId, user.id),
          sql`${items.listingStatus} IN ('DRAFT','PENDING_REVIEW','PUBLISHED')`,
        ),
      );
    await this.db
      .update(users)
      .set({
        publicName: t('account.deleted_name', locale),
        avatarReference: null,
        accountStatus: 'DELETED',
        notificationPrefs: {},
        deletedAt: now,
        updatedAt: now,
      })
      .where(eq(users.id, user.id));
    await this.audit.log({ actorType: 'user', actorId: user.id, action: 'account.deleted' });
  }

  async publicProfile(userId: string) {
    const [u] = await this.db.select().from(users).where(eq(users.id, userId));
    if (!u) throw AppError.notFound();
    return {
      id: u.id,
      publicName: u.publicName,
      trustLevel: await this.trustLevel(u),
      memberSince: u.createdAt.toISOString().slice(0, 7),
    };
  }
}

function mask(v: string): string {
  if (v.includes('@')) {
    const [name, domain] = v.split('@');
    return `${name.slice(0, 2)}***@${domain}`;
  }
  return `${v.slice(0, 4)}***${v.slice(-2)}`;
}
