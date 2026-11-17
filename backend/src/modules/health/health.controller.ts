import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { sql } from 'drizzle-orm';
import { DB, type AppDb } from '../../database/database.module';
import { AI_PROVIDER, type AiProvider } from '../ai/ai.provider';

@ApiTags('health')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(
    @Inject(DB) private readonly db: AppDb,
    @Inject(AI_PROVIDER) private readonly ai: AiProvider,
  ) {}

  @Get()
  async check() {
    let db = 'ok';
    try {
      await this.db.execute(sql`select 1`);
    } catch {
      db = 'error';
    }
    return {
      status: db === 'ok' ? 'ok' : 'degraded',
      db,
      ai: this.ai.enabled ? this.ai.name : 'disabled',
      /** On-device photo recognition: ready, downloading, missing, ... */
      aiRecognition: this.ai.status?.().recognition ?? 'off',
      time: new Date().toISOString(),
      version: process.env.npm_package_version ?? '0.1.0',
    };
  }
}
