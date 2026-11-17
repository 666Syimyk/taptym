import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, gt, inArray, sql } from 'drizzle-orm';
import { DB, type AppDb } from '../../database/database.module';
import { itemComments, items, users, type User } from '../../database/schema';
import { AppError } from '../../common/errors';
import { clampText } from '../../common/text';
import { AccountsService } from '../accounts/accounts.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { scanListingText } from '../items/listing-text';

export interface CommentView {
  id: string;
  body: string;
  author: { id: string; publicName: string; trustLevel: string };
  /** The author is the person who posted the listing. */
  byItemOwner: boolean;
  isMine: boolean;
  /** The viewer may delete it: their own comment, or any comment under their listing. */
  canDelete: boolean;
  createdAt: string;
}

const PUBLIC_STATUSES = ['PUBLISHED', 'RESOLVED'];
const MAX_PER_HOUR = 20;

@Injectable()
export class CommentsService {
  constructor(
    @Inject(DB) private readonly db: AppDb,
    private readonly accounts: AccountsService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  private async item(itemId: string) {
    const [item] = await this.db.select().from(items).where(eq(items.id, itemId));
    if (!item) throw AppError.notFound();
    return item;
  }

  async list(itemId: string, viewerId?: string): Promise<CommentView[]> {
    const item = await this.item(itemId);
    const isOwner = viewerId === item.ownerAccountId;
    if (!isOwner && !PUBLIC_STATUSES.includes(item.listingStatus)) throw AppError.notFound();
    const rows = await this.db
      .select()
      .from(itemComments)
      .where(and(eq(itemComments.itemId, itemId), eq(itemComments.status, 'VISIBLE')))
      .orderBy(asc(itemComments.createdAt))
      .limit(300);
    if (!rows.length) return [];
    const authors = await this.db
      .select()
      .from(users)
      .where(inArray(users.id, [...new Set(rows.map((r) => r.authorId))]));
    const trust = new Map<string, string>();
    for (const a of authors) trust.set(a.id, await this.accounts.trustLevel(a));
    return rows.map((r) => {
      const author = authors.find((a) => a.id === r.authorId)!;
      return {
        id: r.id,
        body: r.body,
        author: {
          id: author.id,
          publicName: author.publicName,
          trustLevel: trust.get(author.id) ?? 'Guest',
        },
        byItemOwner: r.authorId === item.ownerAccountId,
        isMine: r.authorId === viewerId,
        canDelete: r.authorId === viewerId || isOwner,
        createdAt: r.createdAt.toISOString(),
      };
    });
  }

  async create(user: User, itemId: string, rawBody: string): Promise<CommentView> {
    const item = await this.item(itemId);
    // Only live listings take comments; resolved ones stay readable.
    if (item.listingStatus !== 'PUBLISHED') throw AppError.badRequest('comment.not_allowed');
    const isOwner = user.id === item.ownerAccountId;
    if (!isOwner && (await this.accounts.isBlockedEitherWay(user.id, item.ownerAccountId)))
      throw AppError.forbidden('chat.blocked');

    const since = new Date(Date.now() - 3_600_000);
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(itemComments)
      .where(and(eq(itemComments.authorId, user.id), gt(itemComments.createdAt, since)));
    if (count >= MAX_PER_HOUR) throw AppError.tooMany('comment.limit_reached');

    const body = clampText(rawBody, 500);
    if (!body) throw AppError.badRequest('error.validation', { field: 'body' });
    // Comments are public like the listing: no contacts, no money requests. Only the
    // owner of a lost item may mention a reward; anyone else asking to be paid is blocked.
    const issue = scanListingText([body], isOwner && item.listingType === 'LOST' ? 'LOST' : 'FOUND');
    if (issue) throw AppError.badRequest(issue);

    const [row] = await this.db
      .insert(itemComments)
      .values({ itemId, authorId: user.id, body })
      .returning();
    if (!isOwner)
      await this.notifications.notify(
        item.ownerAccountId,
        'ITEM_COMMENT',
        { title: item.title },
        `tabyldy://items/${item.id}`,
      );
    await this.audit.log({
      actorType: 'user',
      actorId: user.id,
      action: 'comment.created',
      targetType: 'comment',
      targetId: row.id,
    });
    return {
      id: row.id,
      body: row.body,
      author: {
        id: user.id,
        publicName: user.publicName,
        trustLevel: await this.accounts.trustLevel(user),
      },
      byItemOwner: isOwner,
      isMine: true,
      canDelete: true,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async remove(user: User, commentId: string): Promise<void> {
    const [row] = await this.db.select().from(itemComments).where(eq(itemComments.id, commentId));
    if (!row || row.status !== 'VISIBLE') throw AppError.notFound();
    const item = await this.item(row.itemId);
    const byAuthor = row.authorId === user.id;
    if (!byAuthor && item.ownerAccountId !== user.id) throw AppError.forbidden();
    await this.db
      .update(itemComments)
      .set({ status: 'REMOVED', removedBy: byAuthor ? 'author' : 'item_owner' })
      .where(eq(itemComments.id, commentId));
    await this.audit.log({
      actorType: 'user',
      actorId: user.id,
      action: 'comment.deleted',
      targetType: 'comment',
      targetId: commentId,
    });
  }
}
