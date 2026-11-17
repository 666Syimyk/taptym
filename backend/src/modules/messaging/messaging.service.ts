import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gt, inArray, isNull, lt, ne, or, sql } from 'drizzle-orm';
import { DB, type AppDb } from '../../database/database.module';
import {
  conversationParticipants,
  conversations,
  itemMedia,
  items,
  messages,
  users,
  type Message,
} from '../../database/schema';
import { AppError } from '../../common/errors';
import { type Locale, t } from '../../common/i18n';
import { clampText } from '../../common/text';
import { NotificationsService } from '../notifications/notifications.service';
import { AccountsService } from '../accounts/accounts.service';
import { MediaService } from '../media/media.service';
import { MessagingEvents, type MessageView } from './messaging.events';
import { scanMessage } from './fraud-scanner';

export interface ConversationView {
  id: string;
  itemId: string;
  itemTitle: string;
  itemType: 'LOST' | 'FOUND';
  claimId: string | null;
  status: string;
  otherParticipant: { id: string; publicName: string };
  lastMessage: MessageView | null;
  unreadCount: number;
  createdAt: string;
}

const RATE_LIMIT_PER_MINUTE = 30;

@Injectable()
export class MessagingService {
  /** userId → set of live socket ids, maintained by the gateway. */
  readonly online = new Map<string, number>();

  constructor(
    @Inject(DB) private readonly db: AppDb,
    private readonly notifications: NotificationsService,
    private readonly accounts: AccountsService,
    private readonly media: MediaService,
    private readonly events: MessagingEvents,
  ) {}

  /** Opens (or reuses) the conversation for an approved claim. Both locales get the same system text later. */
  async openForClaim(
    itemId: string,
    claimId: string,
    finderId: string,
    ownerId: string,
    locale: Locale,
  ): Promise<string> {
    const [existing] = await this.db
      .select()
      .from(conversations)
      .where(eq(conversations.linkedClaimId, claimId));
    if (existing) return existing.id;
    const [conv] = await this.db
      .insert(conversations)
      .values({ linkedItemId: itemId, linkedClaimId: claimId })
      .returning();
    await this.db.insert(conversationParticipants).values([
      { conversationId: conv.id, userId: finderId, role: 'finder' },
      { conversationId: conv.id, userId: ownerId, role: 'owner' },
    ]);
    await this.system(conv.id, t('chat.system.opened', locale));
    return conv.id;
  }

  async system(
    conversationId: string,
    body: string,
    kind: 'system' | 'handoff' = 'system',
  ): Promise<MessageView> {
    const [row] = await this.db
      .insert(messages)
      .values({ conversationId, senderId: null, kind, body })
      .returning();
    await this.db
      .update(conversations)
      .set({ lastMessageAt: row.createdAt })
      .where(eq(conversations.id, conversationId));
    const view = this.view(row);
    const participants = await this.participantIds(conversationId);
    this.events.emitMessage(participants, view);
    return view;
  }

  private async participantIds(conversationId: string): Promise<string[]> {
    const rows = await this.db
      .select({ userId: conversationParticipants.userId })
      .from(conversationParticipants)
      .where(eq(conversationParticipants.conversationId, conversationId));
    return rows.map((r) => r.userId);
  }

  async assertParticipant(conversationId: string, userId: string) {
    const [p] = await this.db
      .select()
      .from(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId),
        ),
      );
    if (!p) throw AppError.notFound(); // never confirm existence of someone else's conversation
    return p;
  }

  view(row: Message, viewerId?: string): MessageView {
    return {
      id: row.id,
      conversationId: row.conversationId,
      senderId: row.senderId,
      clientMessageId: row.clientMessageId,
      kind: row.kind,
      body: row.moderationState === 'HIDDEN' ? '' : row.body,
      attachmentUrl: null,
      warnings: row.warnings,
      createdAt: row.createdAt.toISOString(),
      ...(viewerId ? { mine: row.senderId === viewerId } : {}),
    };
  }

  async send(
    conversationId: string,
    senderId: string,
    body: string,
    clientMessageId?: string,
    attachmentMediaId?: string,
  ): Promise<MessageView> {
    await this.assertParticipant(conversationId, senderId);
    const [conv] = await this.db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId));
    if (!conv || conv.conversationStatus !== 'ACTIVE')
      throw AppError.badRequest(
        conv?.conversationStatus === 'BLOCKED' ? 'chat.blocked' : 'chat.closed',
      );
    const participants = await this.participantIds(conversationId);
    const other = participants.find((p) => p !== senderId)!;
    if (await this.accounts.isBlockedEitherWay(senderId, other))
      throw AppError.forbidden('chat.blocked');

    // Deduplicate by client id (reconnect-safe).
    if (clientMessageId) {
      const [dup] = await this.db
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.conversationId, conversationId),
            eq(messages.senderId, senderId),
            eq(messages.clientMessageId, clientMessageId),
          ),
        );
      if (dup) return this.view(dup, senderId);
    }
    const since = new Date(Date.now() - 60_000);
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(messages)
      .where(and(eq(messages.senderId, senderId), gt(messages.createdAt, since)));
    if (count >= RATE_LIMIT_PER_MINUTE) throw AppError.tooMany();

    const text = clampText(body, 2000);
    let attachmentUrl: string | null = null;
    if (attachmentMediaId) {
      const [m] = await this.db.select().from(itemMedia).where(eq(itemMedia.id, attachmentMediaId));
      if (!m || m.uploaderId !== senderId) throw AppError.badRequest('item.media_not_owned');
      if (m.processingStatus !== 'READY' && m.processingStatus !== 'READY_UNCHECKED')
        throw AppError.badRequest('item.media_not_ready');
      attachmentUrl = this.media.view(m, true).publicUrl;
    }
    if (!text && !attachmentMediaId) throw AppError.badRequest('error.validation');

    const warnings = scanMessage(text);
    const [row] = await this.db
      .insert(messages)
      .values({
        conversationId,
        senderId,
        clientMessageId: clientMessageId ?? null,
        kind: attachmentMediaId ? 'image' : 'text',
        body: text,
        attachmentMediaId: attachmentMediaId ?? null,
        warnings,
        moderationState: warnings.length ? 'WARNED' : 'OK',
      })
      .returning();
    await this.db
      .update(conversations)
      .set({ lastMessageAt: row.createdAt })
      .where(eq(conversations.id, conversationId));

    const view = { ...this.view(row), attachmentUrl };
    this.events.emitMessage(participants, view);
    if (!this.online.get(other)) {
      const [item] = await this.db
        .select({ title: items.title })
        .from(items)
        .where(eq(items.id, conv.linkedItemId));
      await this.notifications.notify(
        other,
        'MESSAGE_RECEIVED',
        { title: item?.title ?? '' },
        `tabyldy://conversations/${conversationId}`,
      );
    }
    return { ...view, mine: true };
  }

  async history(
    conversationId: string,
    userId: string,
    opts: { before?: string; after?: string; limit?: number },
  ) {
    await this.assertParticipant(conversationId, userId);
    const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100);
    const conds = [eq(messages.conversationId, conversationId)];
    if (opts.after) {
      const [anchor] = await this.db.select().from(messages).where(eq(messages.id, opts.after));
      if (anchor)
        conds.push(
          or(
            gt(messages.createdAt, anchor.createdAt),
            and(eq(messages.createdAt, anchor.createdAt), gt(messages.id, anchor.id)),
          )!,
        );
    }
    if (opts.before) {
      const [anchor] = await this.db.select().from(messages).where(eq(messages.id, opts.before));
      if (anchor)
        conds.push(
          or(
            lt(messages.createdAt, anchor.createdAt),
            and(eq(messages.createdAt, anchor.createdAt), lt(messages.id, anchor.id)),
          )!,
        );
    }
    const rows = await this.db
      .select()
      .from(messages)
      .where(and(...conds))
      .orderBy(
        opts.after ? messages.createdAt : desc(messages.createdAt),
        opts.after ? messages.id : desc(messages.id),
      )
      .limit(limit + 1);
    const slice = rows.slice(0, limit);
    const ordered = opts.after ? slice : slice.reverse();
    const attachmentIds = ordered.map((m) => m.attachmentMediaId).filter(Boolean) as string[];
    const media = attachmentIds.length
      ? await this.db.select().from(itemMedia).where(inArray(itemMedia.id, attachmentIds))
      : [];
    return {
      items: ordered.map((m) => ({
        ...this.view(m, userId),
        attachmentUrl: m.attachmentMediaId
          ? this.media.view(
              media.find((x) => x.id === m.attachmentMediaId)!,
              true,
            ).publicUrl
          : null,
      })),
      hasMore: rows.length > limit,
    };
  }

  async markRead(conversationId: string, userId: string, messageId: string) {
    await this.assertParticipant(conversationId, userId);
    await this.db
      .update(conversationParticipants)
      .set({ lastReadMessageId: messageId })
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId),
        ),
      );
  }

  async list(userId: string): Promise<ConversationView[]> {
    const mine = await this.db
      .select()
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, userId));
    if (!mine.length) return [];
    const convIds = mine.map((m) => m.conversationId);
    const convs = await this.db
      .select()
      .from(conversations)
      .where(inArray(conversations.id, convIds))
      .orderBy(desc(conversations.lastMessageAt));
    const others = await this.db
      .select({
        conversationId: conversationParticipants.conversationId,
        userId: conversationParticipants.userId,
        publicName: users.publicName,
      })
      .from(conversationParticipants)
      .innerJoin(users, eq(users.id, conversationParticipants.userId))
      .where(
        and(
          inArray(conversationParticipants.conversationId, convIds),
          ne(conversationParticipants.userId, userId),
        ),
      );
    const itemRows = await this.db
      .select({ id: items.id, title: items.title, listingType: items.listingType })
      .from(items)
      .where(
        inArray(
          items.id,
          convs.map((c) => c.linkedItemId),
        ),
      );
    const out: ConversationView[] = [];
    for (const c of convs) {
      const me = mine.find((m) => m.conversationId === c.id)!;
      const other = others.find((o) => o.conversationId === c.id);
      const item = itemRows.find((i) => i.id === c.linkedItemId);
      const [last] = await this.db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, c.id))
        .orderBy(desc(messages.createdAt), desc(messages.id))
        .limit(1);
      let unread = 0;
      if (last) {
        const readAnchor = me.lastReadMessageId
          ? (await this.db.select().from(messages).where(eq(messages.id, me.lastReadMessageId)))[0]
          : null;
        const conds = [
          eq(messages.conversationId, c.id),
          or(isNull(messages.senderId), ne(messages.senderId, userId))!,
        ];
        if (readAnchor) conds.push(gt(messages.createdAt, readAnchor.createdAt));
        const [{ count }] = await this.db
          .select({ count: sql<number>`count(*)::int` })
          .from(messages)
          .where(and(...conds));
        unread = count;
      }
      out.push({
        id: c.id,
        itemId: c.linkedItemId,
        itemTitle: item?.title ?? '',
        itemType: item?.listingType ?? 'FOUND',
        claimId: c.linkedClaimId,
        status: c.conversationStatus,
        otherParticipant: other
          ? { id: other.userId, publicName: other.publicName }
          : { id: '', publicName: '' },
        lastMessage: last ? this.view(last, userId) : null,
        unreadCount: unread,
        createdAt: c.createdAt.toISOString(),
      });
    }
    return out;
  }

  async close(conversationId: string, userId: string) {
    await this.assertParticipant(conversationId, userId);
    await this.db
      .update(conversations)
      .set({ conversationStatus: 'CLOSED' })
      .where(eq(conversations.id, conversationId));
  }

  async totalUnread(userId: string): Promise<number> {
    const list = await this.list(userId);
    return list.reduce((s, c) => s + c.unreadCount, 0);
  }

  async conversationIdForClaim(claimId: string): Promise<string | null> {
    const [c] = await this.db
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.linkedClaimId, claimId));
    return c?.id ?? null;
  }
}
