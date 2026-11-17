import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { and, eq, gt, inArray, isNull, sql } from 'drizzle-orm';
import { DB, type AppDb } from '../../database/database.module';
import {
  claims,
  conversationParticipants,
  deviceSessions,
  itemMedia,
  items,
  messages,
  moderationCases,
  notifications,
  otpChallenges,
  reports,
  riskEvents,
  savedSearches,
  trustEvents,
  userContacts,
  users,
} from '../../database/schema';
import { APP_CONFIG, type AppConfig } from '../../config/app-config';
import { AppError } from '../../common/errors';
import {
  hmacHex,
  isValidDestination,
  normalizeDestination,
  randomNumericCode,
  randomToken,
  safeEqualHex,
  sha256Hex,
} from '../../common/crypto';
import { type Locale, t } from '../../common/i18n';
import { OTP_DELIVERY, type OtpDelivery } from './otp-delivery';
import type { AccessTokenPayload } from '../../common/auth';
import { AuditService } from '../audit/audit.service';

const RESEND_WINDOW_MS = 10 * 60 * 1000;
const MAX_SENDS_PER_WINDOW = 3;

@Injectable()
export class AuthService {
  constructor(
    @Inject(DB) private readonly db: AppDb,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
    @Inject(OTP_DELIVERY) private readonly delivery: OtpDelivery,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
  ) {}

  private destHash(channel: string, destination: string) {
    return hmacHex(this.cfg.auth.otpHmacSecret, `${channel}:${destination}`);
  }

  async start(channel: 'phone' | 'email', rawDestination: string, locale: Locale, ipHash: string) {
    const destination = normalizeDestination(channel, rawDestination);
    if (!isValidDestination(channel, destination))
      throw AppError.badRequest('auth.contact_invalid');
    const destinationHash = this.destHash(channel, destination);

    // Resend limits per destination (anti-abuse). Response shape never reveals account existence.
    const since = new Date(Date.now() - RESEND_WINDOW_MS);
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(otpChallenges)
      .where(
        and(eq(otpChallenges.destinationHash, destinationHash), gt(otpChallenges.createdAt, since)),
      );
    if (count >= MAX_SENDS_PER_WINDOW) throw AppError.tooMany('auth.resend_too_soon');

    const code = randomNumericCode(6);
    const expiresAt = new Date(Date.now() + this.cfg.auth.otpTtlSeconds * 1000);
    const [challenge] = await this.db
      .insert(otpChallenges)
      .values({
        channel,
        destination,
        destinationHash,
        codeHash: hmacHex(this.cfg.auth.otpHmacSecret, `${code}`),
        expiresAt,
        ipHash,
      })
      .returning({ id: otpChallenges.id });

    await this.delivery.send(channel, destination, code, locale);
    return {
      challengeId: challenge.id,
      expiresInSeconds: this.cfg.auth.otpTtlSeconds,
      message: t('auth.code_sent', locale),
      ...(this.cfg.auth.otpDevEcho ? { devCode: code } : {}),
    };
  }

  async verify(
    challengeId: string,
    code: string,
    meta: {
      deviceName?: string;
      platform?: string;
      locale: Locale;
      guestRefreshToken?: string;
    },
  ) {
    const [challenge] = await this.db
      .select()
      .from(otpChallenges)
      .where(eq(otpChallenges.id, challengeId));
    if (!challenge || challenge.consumedAt || challenge.expiresAt.getTime() < Date.now()) {
      throw AppError.badRequest('auth.code_invalid');
    }
    if (challenge.attempts >= challenge.maxAttempts)
      throw AppError.tooMany('auth.too_many_attempts');

    const ok = safeEqualHex(challenge.codeHash, hmacHex(this.cfg.auth.otpHmacSecret, code.trim()));
    if (!ok) {
      await this.db
        .update(otpChallenges)
        .set({ attempts: challenge.attempts + 1 })
        .where(eq(otpChallenges.id, challengeId));
      if (challenge.attempts + 1 >= challenge.maxAttempts)
        throw AppError.tooMany('auth.too_many_attempts');
      throw AppError.badRequest('auth.code_invalid');
    }
    await this.db
      .update(otpChallenges)
      .set({ consumedAt: new Date() })
      .where(eq(otpChallenges.id, challengeId));

    // Find or create the minimal account (PRD §9.1).
    const [contact] = await this.db
      .select()
      .from(userContacts)
      .where(
        and(
          eq(userContacts.channel, challenge.channel),
          eq(userContacts.destinationHash, challenge.destinationHash),
        ),
      );

    const guest = await this.findGuest(meta.guestRefreshToken);

    let userId: string;
    let isNewAccount = false;
    if (contact) {
      userId = contact.userId;
      const [u] = await this.db.select().from(users).where(eq(users.id, userId));
      if (!u || u.accountStatus === 'DELETED') throw AppError.badRequest('auth.code_invalid');
      if (u.accountStatus === 'BANNED') throw AppError.forbidden('error.account_banned');
      // The contact already has an account: move what the guest created into it.
      if (guest && guest.userId !== userId) await this.mergeGuest(guest.userId, userId);
    } else if (guest) {
      // Upgrade this device's guest account in place — listings and chats stay where they are.
      userId = guest.userId;
      isNewAccount = true;
      await this.db
        .update(users)
        .set({ contactVerificationState: 'VERIFIED', locale: meta.locale, updatedAt: new Date() })
        .where(eq(users.id, userId));
      await this.attachContact(userId, challenge);
      await this.audit.log({
        actorType: 'user',
        actorId: userId,
        action: 'account.guest_verified',
      });
    } else {
      const [u] = await this.db
        .insert(users)
        .values({
          publicName: t('account.default_name', meta.locale),
          contactVerificationState: 'VERIFIED',
          locale: meta.locale,
        })
        .returning({ id: users.id });
      userId = u.id;
      isNewAccount = true;
      await this.attachContact(userId, challenge);
      await this.audit.log({ actorType: 'user', actorId: userId, action: 'account.created' });
    }
    if (guest) await this.logout(guest.sessionId);

    const tokens = await this.issueSession(userId, meta);
    return { ...tokens, userId, isNewAccount };
  }

  /**
   * Anonymous device account: lets someone photograph and post a find without any sign-up.
   * Trust level stays "Guest" until a contact is verified.
   */
  async guest(meta: { deviceName?: string; platform?: string; locale: Locale }) {
    const [u] = await this.db
      .insert(users)
      .values({
        publicName: t('account.default_name', meta.locale),
        contactVerificationState: 'NONE',
        locale: meta.locale,
      })
      .returning({ id: users.id });
    await this.audit.log({ actorType: 'user', actorId: u.id, action: 'account.guest_created' });
    const tokens = await this.issueSession(u.id, meta);
    return { ...tokens, userId: u.id, isNewAccount: true };
  }

  private async attachContact(
    userId: string,
    challenge: { channel: string; destination: string; destinationHash: string },
  ) {
    await this.db.insert(userContacts).values({
      userId,
      channel: challenge.channel,
      destination: challenge.destination,
      destinationHash: challenge.destinationHash,
      verifiedAt: new Date(),
    });
    await this.db.insert(trustEvents).values({ userId, kind: 'contact_verified', delta: 10 });
  }

  /** Resolves a live guest session from its refresh token; ignores anything else. */
  private async findGuest(refreshToken?: string) {
    if (!refreshToken) return null;
    const [row] = await this.db
      .select({
        sessionId: deviceSessions.id,
        userId: users.id,
        expiresAt: deviceSessions.expiresAt,
      })
      .from(deviceSessions)
      .innerJoin(users, eq(users.id, deviceSessions.userId))
      .where(
        and(
          eq(deviceSessions.refreshTokenHash, sha256Hex(refreshToken)),
          isNull(deviceSessions.revokedAt),
          eq(users.contactVerificationState, 'NONE'),
          eq(users.accountStatus, 'ACTIVE'),
        ),
      );
    if (!row || row.expiresAt.getTime() < Date.now()) return null;
    return row;
  }

  /** Moves everything a guest created into an existing account, then retires the guest. */
  private async mergeGuest(guestId: string, targetId: string) {
    await this.db.transaction(async (tx) => {
      await tx
        .update(items)
        .set({ ownerAccountId: targetId })
        .where(eq(items.ownerAccountId, guestId));
      await tx
        .update(itemMedia)
        .set({ uploaderId: targetId })
        .where(eq(itemMedia.uploaderId, guestId));
      await tx.update(claims).set({ claimantId: targetId }).where(eq(claims.claimantId, guestId));
      await tx.update(messages).set({ senderId: targetId }).where(eq(messages.senderId, guestId));
      await tx.update(reports).set({ reporterId: targetId }).where(eq(reports.reporterId, guestId));
      await tx
        .update(notifications)
        .set({ userId: targetId })
        .where(eq(notifications.userId, guestId));
      await tx
        .update(moderationCases)
        .set({ userId: targetId })
        .where(eq(moderationCases.userId, guestId));
      await tx.update(riskEvents).set({ userId: targetId }).where(eq(riskEvents.userId, guestId));
      await tx
        .update(savedSearches)
        .set({ userId: targetId })
        .where(eq(savedSearches.userId, guestId));
      // Chat membership is keyed by (conversation, user): drop duplicates before moving.
      const shared = await tx
        .select({ id: conversationParticipants.conversationId })
        .from(conversationParticipants)
        .where(eq(conversationParticipants.userId, targetId));
      if (shared.length)
        await tx.delete(conversationParticipants).where(
          and(
            eq(conversationParticipants.userId, guestId),
            inArray(
              conversationParticipants.conversationId,
              shared.map((r) => r.id),
            ),
          ),
        );
      await tx
        .update(conversationParticipants)
        .set({ userId: targetId })
        .where(eq(conversationParticipants.userId, guestId));
      await tx
        .update(users)
        .set({ accountStatus: 'DELETED', deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(users.id, guestId));
      await tx
        .update(deviceSessions)
        .set({ revokedAt: new Date() })
        .where(and(eq(deviceSessions.userId, guestId), isNull(deviceSessions.revokedAt)));
    });
    await this.audit.log({
      actorType: 'user',
      actorId: targetId,
      action: 'account.guest_merged',
      targetType: 'user',
      targetId: guestId,
    });
  }

  private async issueSession(userId: string, meta: { deviceName?: string; platform?: string }) {
    const refreshToken = randomToken(48);
    const expiresAt = new Date(Date.now() + this.cfg.auth.refreshTtlDays * 86_400_000);
    const [session] = await this.db
      .insert(deviceSessions)
      .values({
        userId,
        refreshTokenHash: sha256Hex(refreshToken),
        deviceName: meta.deviceName,
        platform: meta.platform,
        expiresAt,
      })
      .returning({ id: deviceSessions.id });
    const accessToken = await this.signAccess(userId, session.id);
    return { accessToken, refreshToken, expiresInSeconds: this.cfg.auth.accessTtlSeconds };
  }

  private signAccess(userId: string, sessionId: string) {
    const payload: AccessTokenPayload = { sub: userId, sid: sessionId, typ: 'access' };
    return this.jwt.signAsync(payload, {
      secret: this.cfg.auth.accessSecret,
      expiresIn: this.cfg.auth.accessTtlSeconds,
    });
  }

  /** Refresh token rotation: the presented token is revoked and a new one is issued. */
  async refresh(refreshToken: string) {
    const hash = sha256Hex(refreshToken);
    const [session] = await this.db
      .select()
      .from(deviceSessions)
      .where(and(eq(deviceSessions.refreshTokenHash, hash), isNull(deviceSessions.revokedAt)));
    if (!session || session.expiresAt.getTime() < Date.now())
      throw AppError.unauthorized('auth.session_invalid');
    const [user] = await this.db.select().from(users).where(eq(users.id, session.userId));
    if (!user || user.accountStatus === 'DELETED')
      throw AppError.unauthorized('auth.session_invalid');
    if (user.accountStatus === 'BANNED') throw AppError.forbidden('error.account_banned');

    const newToken = randomToken(48);
    await this.db
      .update(deviceSessions)
      .set({ refreshTokenHash: sha256Hex(newToken), lastSeenAt: new Date() })
      .where(eq(deviceSessions.id, session.id));
    const accessToken = await this.signAccess(user.id, session.id);
    return {
      accessToken,
      refreshToken: newToken,
      expiresInSeconds: this.cfg.auth.accessTtlSeconds,
      userId: user.id,
      isNewAccount: false,
    };
  }

  async logout(sessionId: string) {
    await this.db
      .update(deviceSessions)
      .set({ revokedAt: new Date() })
      .where(eq(deviceSessions.id, sessionId));
  }

  async revokeAllSessions(userId: string) {
    await this.db
      .update(deviceSessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(deviceSessions.userId, userId), isNull(deviceSessions.revokedAt)));
  }
}
