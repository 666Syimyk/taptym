import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gt, sql } from 'drizzle-orm';
import { DB, type AppDb } from '../../database/database.module';
import {
  claims,
  itemComments,
  items,
  messages,
  moderationCases,
  reports,
  users,
} from '../../database/schema';
import { AppError } from '../../common/errors';
import { AuditService } from '../audit/audit.service';
import type { CreateReportDto } from './reports.dto';

@Injectable()
export class ReportsService {
  constructor(
    @Inject(DB) private readonly db: AppDb,
    private readonly audit: AuditService,
  ) {}

  async create(reporterId: string, dto: CreateReportDto) {
    const since = new Date(Date.now() - 86_400_000);
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(reports)
      .where(and(eq(reports.reporterId, reporterId), gt(reports.createdAt, since)));
    if (count >= 10) throw AppError.tooMany();

    // Validate the target exists and derive the user it concerns.
    let subjectUserId: string | null = null;
    let itemId: string | null = null;
    let claimId: string | null = null;
    if (dto.targetType === 'item') {
      const [it] = await this.db.select().from(items).where(eq(items.id, dto.targetId));
      if (!it) throw AppError.notFound();
      subjectUserId = it.ownerAccountId;
      itemId = it.id;
    } else if (dto.targetType === 'user') {
      const [u] = await this.db.select().from(users).where(eq(users.id, dto.targetId));
      if (!u) throw AppError.notFound();
      subjectUserId = u.id;
    } else if (dto.targetType === 'message') {
      const [m] = await this.db.select().from(messages).where(eq(messages.id, dto.targetId));
      if (!m) throw AppError.notFound();
      subjectUserId = m.senderId;
    } else if (dto.targetType === 'comment') {
      const [c] = await this.db.select().from(itemComments).where(eq(itemComments.id, dto.targetId));
      if (!c) throw AppError.notFound();
      subjectUserId = c.authorId;
      itemId = c.itemId;
    } else {
      const [c] = await this.db.select().from(claims).where(eq(claims.id, dto.targetId));
      if (!c) throw AppError.notFound();
      subjectUserId = c.claimantId;
      claimId = c.id;
    }
    if (subjectUserId === reporterId) throw AppError.badRequest('error.validation');

    const [report] = await this.db
      .insert(reports)
      .values({
        reporterId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        reason: dto.reason,
        details: dto.details,
      })
      .returning();
    await this.db
      .insert(moderationCases)
      .values({ kind: 'report', reportId: report.id, itemId, claimId, userId: subjectUserId });
    await this.audit.log({
      actorType: 'user',
      actorId: reporterId,
      action: 'report.created',
      targetType: dto.targetType,
      targetId: dto.targetId,
    });
    return { id: report.id, status: report.status, createdAt: report.createdAt.toISOString() };
  }
}
