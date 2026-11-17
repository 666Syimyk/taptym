import { Body, Controller, HttpCode, Inject, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DB, type AppDb } from '../../database/database.module';
import { analyticsEvents } from '../../database/schema';

/** Allow-listed events (PRD §28). Anything else is dropped silently. */
export const EVENT_NAMES = [
  'app_open',
  'onboarding_completed',
  'item_creation_started',
  'item_creation_completed',
  'item_creation_failed',
  'search_performed',
  'match_opened',
  'claim_submitted',
  'claim_resolved',
  'conversation_started',
  'handoff_confirmed',
  'report_submitted',
] as const;

/** Allow-listed, non-personal property keys. */
const PROP_KEYS = new Set([
  'category_slug',
  'listing_type',
  'screen',
  'result',
  'duration_ms',
  'locale',
  'platform',
  'app_version',
  'step',
  'has_photo',
  'ai_used',
]);

class EventDto {
  @IsIn([...EVENT_NAMES]) name: (typeof EVENT_NAMES)[number];
  @IsOptional() @IsObject() props?: Record<string, unknown>;
}

class EventsBatchDto {
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => EventDto)
  events: EventDto[];
  @IsOptional() @IsString() @MaxLength(64) anonymousId?: string;
}

@ApiTags('analytics')
@Controller({ path: 'analytics', version: '1' })
export class AnalyticsController {
  constructor(@Inject(DB) private readonly db: AppDb) {}

  @Post('events')
  @HttpCode(202)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async ingest(@Body() dto: EventsBatchDto) {
    const rows = dto.events.map((e) => {
      const props: Record<string, string | number | boolean> = {};
      for (const [k, v] of Object.entries(e.props ?? {})) {
        if (!PROP_KEYS.has(k)) continue;
        if (typeof v === 'string') props[k] = v.slice(0, 64);
        else if (typeof v === 'number' || typeof v === 'boolean') props[k] = v;
      }
      return { name: e.name, props, anonymousId: dto.anonymousId ?? null };
    });
    if (rows.length) await this.db.insert(analyticsEvents).values(rows);
    return { accepted: rows.length };
  }
}
