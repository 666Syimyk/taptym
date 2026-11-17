import { Body, Controller, HttpCode, Inject, Injectable, Module, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsIn, IsInt, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';
import { and, eq, gt, sql } from 'drizzle-orm';
import { DB, type AppDb } from '../../database/database.module';
import { feedback, type User } from '../../database/schema';
import { AuthGuard, CurrentUser, OptionalAuth, ReqLocale } from '../../common/auth';
import type { Locale } from '../../common/i18n';
import { AppError } from '../../common/errors';
import { clampText } from '../../common/text';

export const FEEDBACK_KINDS = ['idea', 'problem', 'praise', 'question', 'other'] as const;

export class CreateFeedbackDto {
  @ApiProperty({ enum: FEEDBACK_KINDS })
  @IsIn([...FEEDBACK_KINDS])
  kind: (typeof FEEDBACK_KINDS)[number];
  @ApiProperty({ maxLength: 2000 }) @IsString() @Length(3, 2000) message: string;
  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;
  @ApiPropertyOptional({ description: 'How to answer: phone, email or Telegram (optional).' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  contact?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) platform?: string;
}

@Injectable()
export class FeedbackService {
  constructor(@Inject(DB) private readonly db: AppDb) {}

  async create(dto: CreateFeedbackDto, locale: Locale, user?: User) {
    if (user) {
      const since = new Date(Date.now() - 86_400_000);
      const [{ count }] = await this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(feedback)
        .where(and(eq(feedback.userId, user.id), gt(feedback.createdAt, since)));
      if (count >= 10) throw AppError.tooMany('feedback.limit_reached');
    }
    const message = clampText(dto.message, 2000);
    if (message.length < 3) throw AppError.badRequest('error.validation', { field: 'message' });
    const [row] = await this.db
      .insert(feedback)
      .values({
        userId: user?.id ?? null,
        kind: dto.kind,
        rating: dto.rating ?? null,
        message,
        contact: clampText(dto.contact, 120) || null,
        locale,
        platform: clampText(dto.platform, 20) || null,
      })
      .returning({ id: feedback.id, createdAt: feedback.createdAt });
    return { id: row.id, createdAt: row.createdAt.toISOString() };
  }
}

@ApiTags('feedback')
@Controller({ path: 'feedback', version: '1' })
export class FeedbackController {
  constructor(private readonly service: FeedbackService) {}

  @Post()
  @HttpCode(201)
  @OptionalAuth()
  @UseGuards(AuthGuard)
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  @ApiOperation({ summary: 'Send feedback about the platform to the team. Guests allowed.' })
  create(@Body() dto: CreateFeedbackDto, @ReqLocale() locale: Locale, @CurrentUser() user?: User) {
    return this.service.create(dto, locale, user);
  }
}

@Module({ controllers: [FeedbackController], providers: [FeedbackService] })
export class FeedbackModule {}
