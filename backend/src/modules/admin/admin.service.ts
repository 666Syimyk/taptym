import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { randomBytes } from 'node:crypto';
import { and, desc, eq, gt, ilike, ne, or, sql, type SQL } from 'drizzle-orm';
import { DB, type AppDb } from '../../database/database.module';
import {
  adminUsers,
  analyticsEvents,
  auditLogs,
  categories,
  claimEvidence,
  claims,
  featureFlags,
  feedback,
  itemComments,
  itemMedia,
  itemPrivateDetails,
  items,
  moderationCases,
  reports,
  riskEvents,
  trustEvents,
  userContacts,
  users,
} from '../../database/schema';
import { APP_CONFIG, type AppConfig } from '../../config/app-config';
import { AppError } from '../../common/errors';
import { base32Encode, totpVerify } from '../../common/crypto';
import { NotificationsService } from '../notifications/notifications.service';
import { MessagingService } from '../messaging/messaging.service';
import { AuditService } from '../audit/audit.service';
import { MediaService } from '../media/media.service';
import { ItemsService } from '../items/items.service';
import type { AdminPrincipal, AdminRole, AdminTokenPayload } from './admin.guard';
import type { CategoryUpsertDto } from './admin.dto';

const PII_ROLES: AdminRole[] = ['SUPER_ADMIN', 'SUPPORT', 'SECURITY_ANALYST'];
const PRIVATE_DETAIL_ROLES: AdminRole[] = ['SUPER_ADMIN', 'MODERATOR', 'SECURITY_ANALYST'];

@Injectable()
export class AdminService {
  constructor(
    @Inject(DB) private readonly db: AppDb,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
    private readonly jwt: JwtService,
    private readonly notifications: NotificationsService,
    private readonly messaging: MessagingService,
    private readonly audit: AuditService,
    private readonly media: MediaService,
    private readonly items: ItemsService,
  ) {}

  // ---------- auth ----------

  async login(email: string, password: string, totp?: string) {
    const [admin] = await this.db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, email.toLowerCase().trim()));
    // Constant-ish time: verify against a dummy hash when the admin does not exist.
    const ok = admin
      ? await argon2.verify(admin.passwordHash, password)
      : (await argon2.verify(await argon2.hash('x'), password), false);
    if (!admin || !ok || !admin.active) throw AppError.unauthorized('auth.code_invalid');
    const mfaRequired = this.cfg.admin.requireMfa || Boolean(admin.totpSecret);
    if (mfaRequired) {
      if (!admin.totpSecret) throw new AppError('admin.mfa_setup_required', 403);
      if (!totp || !totpVerify(admin.totpSecret, totp))
        throw AppError.unauthorized('auth.code_invalid');
    }
    await this.db
      .update(adminUsers)
      .set({ lastLoginAt: new Date() })
      .where(eq(adminUsers.id, admin.id));
    await this.audit.log({ actorType: 'admin', actorId: admin.id, action: 'admin.login' });
    const payload: AdminTokenPayload = { sub: admin.id, role: admin.role, typ: 'admin' };
    const token = await this.jwt.signAsync(payload, {
      secret: this.cfg.admin.jwtSecret,
      expiresIn: this.cfg.admin.sessionTtlSeconds,
    });
    return {
      token,
      expiresInSeconds: this.cfg.admin.sessionTtlSeconds,
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role,
        mfaEnabled: Boolean(admin.totpSecret),
      },
    };
  }

  /** Issues a short-lived setup token when MFA is required but not configured yet. */
  async mfaSetup(email: string, password: string) {
    const [admin] = await this.db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, email.toLowerCase().trim()));
    if (!admin || !admin.active || !(await argon2.verify(admin.passwordHash, password)))
      throw AppError.unauthorized('auth.code_invalid');
    if (admin.totpSecret) throw AppError.conflict();
    const secret = base32Encode(randomBytes(20));
    const setupToken = await this.jwt.signAsync(
      { sub: admin.id, typ: 'admin-mfa-setup', secret },
      { secret: this.cfg.admin.jwtSecret, expiresIn: 600 },
    );
    return {
      setupToken,
      secret,
      otpauthUrl: `otpauth://totp/Tabyldy%20Admin:${encodeURIComponent(admin.email)}?secret=${secret}&issuer=Tabyldy`,
    };
  }

  async mfaEnable(setupToken: string, code: string) {
    let payload: { sub: string; typ: string; secret: string };
    try {
      payload = await this.jwt.verifyAsync(setupToken, { secret: this.cfg.admin.jwtSecret });
    } catch {
      throw AppError.unauthorized('auth.session_invalid');
    }
    if (payload.typ !== 'admin-mfa-setup' || !totpVerify(payload.secret, code))
      throw AppError.unauthorized('auth.code_invalid');
    const [admin] = await this.db.select().from(adminUsers).where(eq(adminUsers.id, payload.sub));
    if (!admin?.active || admin.totpSecret) throw AppError.conflict();
    await this.db
      .update(adminUsers)
      .set({ totpSecret: payload.secret })
      .where(eq(adminUsers.id, payload.sub));
    await this.audit.log({ actorType: 'admin', actorId: payload.sub, action: 'admin.mfa_enabled' });
    return { enabled: true };
  }

  async createAdmin(email: string, password: string, role: AdminRole) {
    const [row] = await this.db
      .insert(adminUsers)
      .values({
        email: email.toLowerCase().trim(),
        passwordHash: await argon2.hash(password),
        role,
      })
      .returning({ id: adminUsers.id, email: adminUsers.email, role: adminUsers.role });
    return row;
  }

  async listAdmins() {
    return this.db
      .select({
        id: adminUsers.id,
        email: adminUsers.email,
        role: adminUsers.role,
        active: adminUsers.active,
        mfa: sql<boolean>`${adminUsers.totpSecret} IS NOT NULL`,
        lastLoginAt: adminUsers.lastLoginAt,
      })
      .from(adminUsers);
  }

  // ---------- overview / analytics ----------

  async overview() {
    const count = async (table: any, where?: SQL) => {
      const q = this.db.select({ c: sql<number>`count(*)::int` }).from(table);
      const [{ c }] = where ? await q.where(where) : await q;
      return c;
    };
    const dayAgo = new Date(Date.now() - 86_400_000);
    return {
      users: await count(users, sql`${users.accountStatus} <> 'DELETED'`),
      itemsPublished: await count(items, eq(items.listingStatus, 'PUBLISHED')),
      itemsPendingReview: await count(items, eq(items.listingStatus, 'PENDING_REVIEW')),
      itemsResolved: await count(items, eq(items.listingStatus, 'RESOLVED')),
      openCases: await count(moderationCases, eq(moderationCases.status, 'OPEN')),
      openReports: await count(reports, eq(reports.status, 'OPEN')),
      newFeedback: await count(feedback, eq(feedback.status, 'NEW')),
      claimsLast24h: await count(claims, gt(claims.submittedAt, dayAgo)),
      riskEventsLast24h: await count(riskEvents, gt(riskEvents.createdAt, dayAgo)),
    };
  }

  async analytics(days = 14) {
    const since = new Date(Date.now() - days * 86_400_000);
    const byName = await this.db
      .select({ name: analyticsEvents.name, c: sql<number>`count(*)::int` })
      .from(analyticsEvents)
      .where(gt(analyticsEvents.createdAt, since))
      .groupBy(analyticsEvents.name);
    const itemsPerDay = await this.db
      .select({
        day: sql<string>`to_char(${items.createdAt}, 'YYYY-MM-DD')`,
        type: items.listingType,
        c: sql<number>`count(*)::int`,
      })
      .from(items)
      .where(gt(items.createdAt, since))
      .groupBy(sql`1`, items.listingType)
      .orderBy(sql`1`);
    const [{ completed }] = await this.db
      .select({ completed: sql<number>`count(*)::int` })
      .from(claims)
      .where(and(eq(claims.status, 'COMPLETED'), gt(claims.closedAt, since)));
    const [{ rejected }] = await this.db
      .select({ rejected: sql<number>`count(*)::int` })
      .from(claims)
      .where(and(eq(claims.status, 'REJECTED'), gt(claims.closedAt, since)));
    return { days, events: byName, itemsPerDay, claims: { completed, rejected } };
  }

  // ---------- items ----------

  async listItems(opts: { status?: string; q?: string; limit?: number }) {
    const conds: SQL[] = [];
    if (opts.status) conds.push(eq(items.listingStatus, opts.status as any));
    if (opts.q)
      conds.push(
        or(ilike(items.title, `%${opts.q}%`), ilike(items.descriptionPublic, `%${opts.q}%`))!,
      );
    const rows = await this.db
      .select({ id: items.id })
      .from(items)
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(items.createdAt))
      .limit(Math.min(opts.limit ?? 50, 200));
    const ctx = await this.items.loadContext(rows.map((r) => r.id));
    return rows.map((r) => {
      const c = ctx.get(r.id)!;
      return {
        id: c.item.id,
        listingType: c.item.listingType,
        status: c.item.listingStatus,
        title: c.item.title,
        category: c.category.nameRu,
        ownerId: c.item.ownerAccountId,
        ownerName: c.owner.publicName,
        createdAt: c.item.createdAt.toISOString(),
        moderationNote: c.item.moderationNote,
        thumbUrl: c.media[0] ? this.media.view(c.media[0], true).thumbUrl : null,
        mediaStatuses: c.media.map((m) => m.processingStatus),
      };
    });
  }

  async itemDetail(itemId: string, admin: AdminPrincipal) {
    const ctx = (await this.items.loadContext([itemId])).get(itemId);
    if (!ctx) throw AppError.notFound();
    const media = ctx.media.map((m) => ({
      ...this.media.view(m, true),
      protectedUrl:
        m.protectedVariantKey && PRIVATE_DETAIL_ROLES.includes(admin.role)
          ? this.media.signProtectedLink(m.protectedVariantKey)
          : null,
    }));
    let hiddenFeatures: string[] | undefined;
    if (PRIVATE_DETAIL_ROLES.includes(admin.role)) {
      const [priv] = await this.db
        .select()
        .from(itemPrivateDetails)
        .where(eq(itemPrivateDetails.itemId, itemId));
      hiddenFeatures = priv?.protectedAttributes.hiddenFeatures ?? [];
    }
    const itemClaims = await this.db
      .select()
      .from(claims)
      .where(eq(claims.itemId, itemId))
      .orderBy(desc(claims.submittedAt));
    return {
      ...ctx.item,
      category: ctx.category,
      location: ctx.location,
      owner: ctx.owner,
      media,
      hiddenFeatures,
      claims: itemClaims,
    };
  }

  async setItemStatus(
    admin: AdminPrincipal,
    itemId: string,
    status: 'PUBLISHED' | 'PENDING_REVIEW' | 'REMOVED',
    note?: string,
  ) {
    const [item] = await this.db.select().from(items).where(eq(items.id, itemId));
    if (!item) throw AppError.notFound();
    const now = new Date();
    await this.db
      .update(items)
      .set({
        listingStatus: status,
        moderationNote: note ?? null,
        publishedAt: status === 'PUBLISHED' ? (item.publishedAt ?? now) : item.publishedAt,
        updatedAt: now,
      })
      .where(eq(items.id, itemId));
    // Close any pending review cases for the item.
    await this.db
      .update(moderationCases)
      .set({
        status: 'RESOLVED',
        resolution: `status→${status}`,
        resolvedAt: now,
        assigneeAdminId: admin.id,
      })
      .where(
        and(
          eq(moderationCases.itemId, itemId),
          eq(moderationCases.kind, 'item_review'),
          eq(moderationCases.status, 'OPEN'),
        ),
      );
    if (status !== 'PUBLISHED' && note) {
      await this.notifications.notify(
        item.ownerAccountId,
        'ITEM_NEEDS_FIX',
        { title: item.title, note },
        `tabyldy://items/${item.id}`,
      );
    }
    if (status === 'REMOVED') {
      await this.db
        .insert(trustEvents)
        .values({ userId: item.ownerAccountId, kind: 'violation_confirmed', delta: -20 });
    }
    return { id: itemId, status };
  }

  // ---------- cases / reports ----------

  async listCases(opts: { status?: string; kind?: string }) {
    const conds: SQL[] = [];
    if (opts.status) conds.push(eq(moderationCases.status, opts.status));
    if (opts.kind) conds.push(eq(moderationCases.kind, opts.kind));
    const rows = await this.db
      .select()
      .from(moderationCases)
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(moderationCases.createdAt))
      .limit(200);
    const out = [];
    for (const c of rows) {
      const report = c.reportId
        ? (await this.db.select().from(reports).where(eq(reports.id, c.reportId)))[0]
        : null;
      const item = c.itemId
        ? (
            await this.db
              .select({ id: items.id, title: items.title, status: items.listingStatus })
              .from(items)
              .where(eq(items.id, c.itemId))
          )[0]
        : null;
      const user = c.userId
        ? (
            await this.db
              .select({
                id: users.id,
                publicName: users.publicName,
                accountStatus: users.accountStatus,
              })
              .from(users)
              .where(eq(users.id, c.userId))
          )[0]
        : null;
      const comment =
        report?.targetType === 'comment'
          ? ((
              await this.db
                .select({
                  id: itemComments.id,
                  body: itemComments.body,
                  status: itemComments.status,
                })
                .from(itemComments)
                .where(eq(itemComments.id, report.targetId))
            )[0] ?? null)
          : null;
      out.push({ ...c, report, item, user, comment });
    }
    return out;
  }

  async assignCase(admin: AdminPrincipal, caseId: string) {
    const [row] = await this.db
      .update(moderationCases)
      .set({ assigneeAdminId: admin.id, status: 'IN_REVIEW' })
      .where(eq(moderationCases.id, caseId))
      .returning();
    if (!row) throw AppError.notFound();
    return row;
  }

  async resolveCase(admin: AdminPrincipal, caseId: string, resolution: string) {
    const [row] = await this.db
      .update(moderationCases)
      .set({ status: 'RESOLVED', resolution, resolvedAt: new Date(), assigneeAdminId: admin.id })
      .where(eq(moderationCases.id, caseId))
      .returning();
    if (!row) throw AppError.notFound();
    if (row.reportId)
      await this.db.update(reports).set({ status: 'RESOLVED' }).where(eq(reports.id, row.reportId));
    return row;
  }

  // ---------- claims ----------

  async listClaims(status?: string) {
    const rows = await this.db
      .select({
        claim: claims,
        itemTitle: items.title,
        itemType: items.listingType,
        ownerId: items.ownerAccountId,
      })
      .from(claims)
      .innerJoin(items, eq(items.id, claims.itemId))
      .where(status ? eq(claims.status, status as any) : undefined)
      .orderBy(desc(claims.submittedAt))
      .limit(200);
    return rows.map((r) => ({
      ...r.claim,
      itemTitle: r.itemTitle,
      itemType: r.itemType,
      ownerId: r.ownerId,
    }));
  }

  async claimDetail(claimId: string, admin: AdminPrincipal) {
    const [claim] = await this.db.select().from(claims).where(eq(claims.id, claimId));
    if (!claim) throw AppError.notFound();
    const [item] = await this.db.select().from(items).where(eq(items.id, claim.itemId));
    const evidence = PRIVATE_DETAIL_ROLES.includes(admin.role)
      ? await this.db.select().from(claimEvidence).where(eq(claimEvidence.claimId, claimId))
      : [];
    const evidenceViews = [];
    for (const e of evidence) {
      let url: string | null = null;
      if (e.protectedStorageReference) {
        const [m] = await this.db
          .select()
          .from(itemMedia)
          .where(eq(itemMedia.id, e.protectedStorageReference));
        if (m?.protectedVariantKey) url = this.media.signProtectedLink(m.protectedVariantKey);
      }
      evidenceViews.push({ ...e, attachmentUrl: url });
    }
    let hiddenFeatures: string[] | undefined;
    if (PRIVATE_DETAIL_ROLES.includes(admin.role) && item) {
      const [priv] = await this.db
        .select()
        .from(itemPrivateDetails)
        .where(eq(itemPrivateDetails.itemId, item.id));
      hiddenFeatures = priv?.protectedAttributes.hiddenFeatures;
    }
    return { ...claim, item, evidence: evidenceViews, hiddenFeatures };
  }

  async decideClaim(
    admin: AdminPrincipal,
    claimId: string,
    status: 'PLAUSIBLE' | 'REJECTED' | 'UNDER_REVIEW' | 'NEEDS_MORE_INFORMATION',
    note?: string,
    locale: 'ru' | 'ky' | 'en' = 'ru',
  ) {
    const [claim] = await this.db.select().from(claims).where(eq(claims.id, claimId));
    if (!claim) throw AppError.notFound();
    const [item] = await this.db.select().from(items).where(eq(items.id, claim.itemId));
    if (!item) throw AppError.notFound();
    const now = new Date();
    await this.db
      .update(claims)
      .set({
        status,
        decisionNote: note ?? claim.decisionNote,
        reviewedAt: now,
        closedAt: status === 'REJECTED' ? now : null,
        updatedAt: now,
      })
      .where(eq(claims.id, claimId));
    if (status === 'PLAUSIBLE') {
      const finderId = item.listingType === 'FOUND' ? item.ownerAccountId : claim.claimantId;
      const loserId = item.listingType === 'FOUND' ? claim.claimantId : item.ownerAccountId;
      await this.messaging.openForClaim(item.id, claimId, finderId, loserId, locale);
      await this.notifications.notify(
        claim.claimantId,
        'CLAIM_APPROVED',
        { title: item.title },
        `tabyldy://claims/${claimId}`,
      );
    } else if (status === 'REJECTED') {
      await this.notifications.notify(
        claim.claimantId,
        'CLAIM_REJECTED',
        { title: item.title },
        `tabyldy://claims/${claimId}`,
      );
    } else if (status === 'NEEDS_MORE_INFORMATION') {
      await this.notifications.notify(
        claim.claimantId,
        'CLAIM_NEEDS_INFO',
        { title: item.title },
        `tabyldy://claims/${claimId}`,
      );
    }
    await this.db
      .update(moderationCases)
      .set({
        status: 'RESOLVED',
        resolution: `claim→${status}`,
        resolvedAt: now,
        assigneeAdminId: admin.id,
      })
      .where(and(eq(moderationCases.claimId, claimId), eq(moderationCases.status, 'OPEN')));
    return { id: claimId, status };
  }

  // ---------- users ----------

  async listUsers(opts: { q?: string; status?: string }, admin: AdminPrincipal) {
    const conds: SQL[] = [];
    if (opts.status) conds.push(eq(users.accountStatus, opts.status as any));
    if (opts.q) conds.push(ilike(users.publicName, `%${opts.q}%`));
    const rows = await this.db
      .select()
      .from(users)
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(users.createdAt))
      .limit(200);
    return rows.map((u) => this.userRow(u, admin));
  }

  private userRow(u: typeof users.$inferSelect, _admin: AdminPrincipal) {
    return {
      id: u.id,
      publicName: u.publicName,
      accountStatus: u.accountStatus,
      restrictedUntil: u.restrictedUntil,
      contactVerificationState: u.contactVerificationState,
      locale: u.locale,
      createdAt: u.createdAt,
    };
  }

  async userDetail(userId: string, admin: AdminPrincipal) {
    const [u] = await this.db.select().from(users).where(eq(users.id, userId));
    if (!u) throw AppError.notFound();
    const contacts = PII_ROLES.includes(admin.role)
      ? await this.db
          .select({
            channel: userContacts.channel,
            destination: userContacts.destination,
            verifiedAt: userContacts.verifiedAt,
          })
          .from(userContacts)
          .where(eq(userContacts.userId, userId))
      : [];
    const userItems = await this.db
      .select({
        id: items.id,
        title: items.title,
        status: items.listingStatus,
        type: items.listingType,
        createdAt: items.createdAt,
      })
      .from(items)
      .where(eq(items.ownerAccountId, userId))
      .orderBy(desc(items.createdAt))
      .limit(50);
    const risk = await this.db
      .select()
      .from(riskEvents)
      .where(eq(riskEvents.userId, userId))
      .orderBy(desc(riskEvents.createdAt))
      .limit(50);
    const trust = await this.db
      .select()
      .from(trustEvents)
      .where(eq(trustEvents.userId, userId))
      .orderBy(desc(trustEvents.createdAt))
      .limit(50);
    const userClaims = await this.db
      .select()
      .from(claims)
      .where(eq(claims.claimantId, userId))
      .orderBy(desc(claims.submittedAt))
      .limit(50);
    return {
      ...this.userRow(u, admin),
      contacts,
      items: userItems,
      riskEvents: risk,
      trustEvents: trust,
      claims: userClaims,
    };
  }

  async setUserStatus(
    admin: AdminPrincipal,
    userId: string,
    status: 'ACTIVE' | 'RESTRICTED' | 'BANNED',
    until: string | undefined,
    reason: string,
  ) {
    if (status === 'BANNED' && !['SUPER_ADMIN', 'SECURITY_ANALYST'].includes(admin.role))
      throw AppError.forbidden();
    const [u] = await this.db.select().from(users).where(eq(users.id, userId));
    if (!u || u.accountStatus === 'DELETED') throw AppError.notFound();
    await this.db
      .update(users)
      .set({
        accountStatus: status,
        restrictedUntil: status === 'RESTRICTED' && until ? new Date(until) : null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
    if (status !== 'ACTIVE')
      await this.db
        .insert(trustEvents)
        .values({ userId, kind: 'violation_confirmed', delta: status === 'BANNED' ? -100 : -20 });
    await this.notifications.notify(userId, 'SECURITY_WARNING', { note: reason });
    return { id: userId, status };
  }

  async notifyUser(userId: string, note: string) {
    await this.notifications.notify(userId, 'SYSTEM', { note });
    return { ok: true };
  }

  // ---------- comments / feedback ----------

  async listComments(opts: { status?: string; q?: string }) {
    const conds: SQL[] = [];
    if (opts.status) conds.push(eq(itemComments.status, opts.status));
    if (opts.q) conds.push(ilike(itemComments.body, '%' + opts.q + '%'));
    return this.db
      .select({
        id: itemComments.id,
        body: itemComments.body,
        status: itemComments.status,
        removedBy: itemComments.removedBy,
        createdAt: itemComments.createdAt,
        itemId: items.id,
        itemTitle: items.title,
        authorId: users.id,
        authorName: users.publicName,
      })
      .from(itemComments)
      .innerJoin(items, eq(items.id, itemComments.itemId))
      .innerJoin(users, eq(users.id, itemComments.authorId))
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(itemComments.createdAt))
      .limit(200);
  }

  async removeComment(admin: AdminPrincipal, commentId: string) {
    const [row] = await this.db
      .update(itemComments)
      .set({ status: 'REMOVED', removedBy: 'moderator' })
      .where(eq(itemComments.id, commentId))
      .returning();
    if (!row) throw AppError.notFound();
    // Reports about this comment are settled by the removal.
    const related = await this.db
      .select({ id: reports.id })
      .from(reports)
      .where(and(eq(reports.targetType, 'comment'), eq(reports.targetId, commentId)));
    for (const r of related) {
      await this.db.update(reports).set({ status: 'RESOLVED' }).where(eq(reports.id, r.id));
      await this.db
        .update(moderationCases)
        .set({
          status: 'RESOLVED',
          resolution: 'comment removed',
          resolvedAt: new Date(),
          assigneeAdminId: admin.id,
        })
        .where(and(eq(moderationCases.reportId, r.id), ne(moderationCases.status, 'RESOLVED')));
    }
    return { id: row.id, status: row.status };
  }

  listFeedback(opts: { status?: string }) {
    return this.db
      .select({
        id: feedback.id,
        kind: feedback.kind,
        rating: feedback.rating,
        message: feedback.message,
        contact: feedback.contact,
        locale: feedback.locale,
        platform: feedback.platform,
        status: feedback.status,
        createdAt: feedback.createdAt,
        userId: feedback.userId,
        userName: users.publicName,
      })
      .from(feedback)
      .leftJoin(users, eq(users.id, feedback.userId))
      .where(opts.status ? eq(feedback.status, opts.status) : undefined)
      .orderBy(desc(feedback.createdAt))
      .limit(300);
  }

  async setFeedbackStatus(id: string, status: 'NEW' | 'READ' | 'DONE') {
    const [row] = await this.db
      .update(feedback)
      .set({ status })
      .where(eq(feedback.id, id))
      .returning({ id: feedback.id, status: feedback.status });
    if (!row) throw AppError.notFound();
    return row;
  }

  // ---------- categories / flags / audit ----------

  listCategories() {
    return this.db.select().from(categories).orderBy(categories.sortOrder);
  }

  async createCategory(dto: CategoryUpsertDto) {
    if (!dto.slug || !dto.nameRu || !dto.nameKy) throw AppError.badRequest('error.validation');
    const [row] = await this.db
      .insert(categories)
      .values({
        slug: dto.slug,
        nameRu: dto.nameRu,
        nameKy: dto.nameKy,
        nameEn: dto.nameEn ?? null,
        synonyms: dto.synonyms ?? [],
        icon: dto.icon ?? 'tag',
        sensitive: dto.sensitive ?? false,
        publicationPolicy: dto.publicationPolicy ?? 'standard',
        sortOrder: dto.sortOrder ?? 100,
        active: dto.active ?? true,
      })
      .returning();
    return row;
  }

  async updateCategory(id: string, dto: CategoryUpsertDto) {
    const patch = { ...dto };
    delete patch.slug; // slug is immutable once created
    const [row] = await this.db
      .update(categories)
      .set(patch)
      .where(eq(categories.id, id))
      .returning();
    if (!row) throw AppError.notFound();
    return row;
  }

  listFlags() {
    return this.db.select().from(featureFlags);
  }

  async setFlag(key: string, enabled: boolean) {
    const [row] = await this.db
      .update(featureFlags)
      .set({ enabled })
      .where(eq(featureFlags.key, key))
      .returning();
    if (!row) throw AppError.notFound();
    return row;
  }

  listAudit(limit = 200) {
    return this.db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(Math.min(limit, 500));
  }

  listRiskEvents(limit = 200) {
    return this.db
      .select()
      .from(riskEvents)
      .orderBy(desc(riskEvents.createdAt))
      .limit(Math.min(limit, 500));
  }
}
