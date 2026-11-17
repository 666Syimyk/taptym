import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { lt } from 'drizzle-orm';
import { DB, type AppDb } from '../../database/database.module';
import { otpChallenges } from '../../database/schema';
import { MediaService } from '../media/media.service';
import { RiskService } from '../risk/risk.service';

/** Housekeeping jobs. With REDIS_URL these would move to BullMQ workers; in-process is fine for a single instance. */
@Injectable()
export class SchedulerService {
  private readonly logger = new Logger('Scheduler');
  constructor(
    @Inject(DB) private readonly db: AppDb,
    private readonly media: MediaService,
    private readonly risk: RiskService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async liftRestrictions() {
    const n = await this.risk.liftExpired();
    if (n) this.logger.log(`Lifted ${n} expired restrictions`);
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupOtp() {
    await this.db
      .delete(otpChallenges)
      .where(lt(otpChallenges.expiresAt, new Date(Date.now() - 3_600_000)));
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeOrphanMedia() {
    await this.media.purgeOrphans(24);
  }
}
