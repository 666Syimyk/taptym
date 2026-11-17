import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq, gt, sql } from 'drizzle-orm';
import { DB, type AppDb } from '../../database/database.module';
import { moderationCases, riskEvents, users } from '../../database/schema';
import { AuditService } from '../audit/audit.service';

/**
 * Risk engine (PRD §18.3). Signals accumulate into short-term severity; crossing the
 * threshold applies a *temporary* restriction and opens a moderation case. No single
 * opaque score ever leads to a permanent ban — that stays a human decision.
 */
@Injectable()
export class RiskService {
  private readonly logger = new Logger('Risk');
  static readonly WINDOW_HOURS = 24;
  static readonly RESTRICT_THRESHOLD = 6;
  static readonly RESTRICT_HOURS = 24;

  constructor(
    @Inject(DB) private readonly db: AppDb,
    private readonly audit: AuditService,
  ) {}

  async record(
    userId: string,
    signal: string,
    severity: number,
    context?: Record<string, unknown>,
  ): Promise<void> {
    await this.db.insert(riskEvents).values({ userId, signal, severity, context });
    await this.evaluate(userId);
  }

  async recentSeverity(userId: string, hours = RiskService.WINDOW_HOURS): Promise<number> {
    const since = new Date(Date.now() - hours * 3_600_000);
    const [{ total }] = await this.db
      .select({ total: sql<number>`COALESCE(SUM(${riskEvents.severity}), 0)::int` })
      .from(riskEvents)
      .where(and(eq(riskEvents.userId, userId), gt(riskEvents.createdAt, since)));
    return total;
  }

  async evaluate(userId: string): Promise<void> {
    const total = await this.recentSeverity(userId);
    if (total < RiskService.RESTRICT_THRESHOLD) return;
    const [user] = await this.db.select().from(users).where(eq(users.id, userId));
    if (!user || user.accountStatus !== 'ACTIVE') return;
    const until = new Date(Date.now() + RiskService.RESTRICT_HOURS * 3_600_000);
    await this.db
      .update(users)
      .set({ accountStatus: 'RESTRICTED', restrictedUntil: until, updatedAt: new Date() })
      .where(eq(users.id, userId));
    await this.db.insert(moderationCases).values({ kind: 'risk', userId, status: 'OPEN' });
    await this.audit.log({
      actorType: 'system',
      action: 'risk.auto_restrict',
      targetType: 'user',
      targetId: userId,
      metadata: { total, until },
    });
    this.logger.warn(`User ${userId} temporarily restricted (severity ${total})`);
  }

  /** Scheduler hook: lift expired temporary restrictions. */
  async liftExpired(): Promise<number> {
    const rows = await this.db
      .update(users)
      .set({ accountStatus: 'ACTIVE', restrictedUntil: null, updatedAt: new Date() })
      .where(
        and(
          eq(users.accountStatus, 'RESTRICTED'),
          sql`${users.restrictedUntil} IS NOT NULL AND ${users.restrictedUntil} < now()`,
        ),
      )
      .returning({ id: users.id });
    return rows.length;
  }
}
