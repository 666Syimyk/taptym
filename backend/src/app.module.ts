import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_CONFIG, loadConfig } from './config/app-config';
import { DatabaseModule } from './database/database.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AiModule } from './modules/ai/ai.module';
import { MediaModule } from './modules/media/media.module';
import { ItemsModule } from './modules/items/items.module';
import { ClaimsModule } from './modules/claims/claims.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { HandoffsModule } from './modules/handoffs/handoffs.module';
import { ModerationModule } from './modules/moderation/moderation.module';
import { RiskModule } from './modules/risk/risk.module';
import { AdminModule } from './modules/admin/admin.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { HealthModule } from './modules/health/health.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { CommentsModule } from './modules/comments/comments.module';
import { FeedbackModule } from './modules/feedback/feedback.module';

@Global()
@Module({
  providers: [{ provide: APP_CONFIG, useFactory: loadConfig }],
  exports: [APP_CONFIG],
})
export class ConfigModule {}

/**
 * Modular monolith (PRD §22.2). Each module owns its tables' write paths; cross-module
 * access goes through exported services, never through another module's tables directly
 * except for read-only joins.
 */
@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),
    AuditModule,
    AuthModule,
    AccountsModule,
    CatalogModule,
    NotificationsModule,
    AiModule,
    MediaModule,
    RiskModule,
    MessagingModule,
    ItemsModule,
    ClaimsModule,
    HandoffsModule,
    ModerationModule,
    CommentsModule,
    FeedbackModule,
    AdminModule,
    AnalyticsModule,
    HealthModule,
    ...(process.env.DISABLE_SCHEDULER === 'true' ? [] : [SchedulerModule]),
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
