import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, isNotNull, isNull, lt, or, sql } from 'drizzle-orm';
import { DB, type AppDb } from '../../database/database.module';
import { deviceSessions, notifications, users } from '../../database/schema';
import { type Locale, t } from '../../common/i18n';
import { PUSH_ADAPTER, type PushAdapter } from './push.adapter';
import { decodeCursor, encodeCursor, type Page } from '../../common/pagination';

export type NotificationType =
  | 'MATCH_FOUND'
  | 'CLAIM_RECEIVED'
  | 'MESSAGE_RECEIVED'
  | 'CLAIM_NEEDS_INFO'
  | 'CLAIM_APPROVED'
  | 'CLAIM_REJECTED'
  | 'HANDOFF_COMPLETED'
  | 'ITEM_NEEDS_FIX'
  | 'SECURITY_WARNING'
  | 'SYSTEM'
  | 'ITEM_COMMENT';

/** Non-critical categories the user may switch off (PRD §20.2). */
const OPTIONAL_TYPES: NotificationType[] = ['MATCH_FOUND', 'MESSAGE_RECEIVED', 'ITEM_COMMENT'];

export interface NotificationView {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  deepLink: string | null;
  readAt: string | null;
  createdAt: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(DB) private readonly db: AppDb,
    @Inject(PUSH_ADAPTER) private readonly push: PushAdapter,
  ) {}

  async notify(
    userId: string,
    type: NotificationType,
    params: Record<string, string>,
    deepLink?: string,
  ) {
    const [user] = await this.db.select().from(users).where(eq(users.id, userId));
    if (!user || user.accountStatus === 'DELETED') return;
    const prefs = user.notificationPrefs ?? {};
    if (OPTIONAL_TYPES.includes(type) && prefs[type] === false) return;

    await this.db.insert(notifications).values({ userId, type, params, deepLink });

    const locale = (user.locale as Locale) ?? 'ru';
    const sessions = await this.db
      .select({ token: deviceSessions.pushToken })
      .from(deviceSessions)
      .where(
        and(
          eq(deviceSessions.userId, userId),
          isNull(deviceSessions.revokedAt),
          isNotNull(deviceSessions.pushToken),
        ),
      );
    const tokens = sessions.map((s) => s.token!).filter(Boolean);
    await this.push.send(tokens, {
      title: t(`notif.${type}.title`, locale),
      body: t(`notif.${type}.body`, locale, params),
      deepLink,
      collapseKey: type === 'MESSAGE_RECEIVED' ? deepLink : undefined,
    });
  }

  render(row: typeof notifications.$inferSelect, locale: Locale): NotificationView {
    return {
      id: row.id,
      type: row.type as NotificationType,
      title: t(`notif.${row.type}.title`, locale),
      body: t(`notif.${row.type}.body`, locale, row.params),
      deepLink: row.deepLink,
      readAt: row.readAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async list(
    userId: string,
    locale: Locale,
    cursor?: string,
    limit = 20,
  ): Promise<Page<NotificationView>> {
    const c = decodeCursor(cursor);
    const where = c
      ? and(
          eq(notifications.userId, userId),
          or(
            lt(notifications.createdAt, new Date(c.ts)),
            and(eq(notifications.createdAt, new Date(c.ts)), lt(notifications.id, c.id)),
          ),
        )
      : eq(notifications.userId, userId);
    const rows = await this.db
      .select()
      .from(notifications)
      .where(where)
      .orderBy(desc(notifications.createdAt), desc(notifications.id))
      .limit(limit + 1);
    const slice = rows.slice(0, limit);
    const last = slice[slice.length - 1];
    return {
      items: slice.map((r) => this.render(r, locale)),
      nextCursor:
        rows.length > limit && last
          ? encodeCursor({ ts: last.createdAt.toISOString(), id: last.id })
          : null,
    };
  }

  async unreadCount(userId: string): Promise<number> {
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
    return count;
  }

  async markRead(userId: string, id?: string) {
    const where = id
      ? and(eq(notifications.userId, userId), eq(notifications.id, id))
      : and(eq(notifications.userId, userId), isNull(notifications.readAt));
    await this.db.update(notifications).set({ readAt: new Date() }).where(where);
  }
}
