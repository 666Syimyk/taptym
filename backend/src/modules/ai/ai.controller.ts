import { Body, Controller, HttpCode, Inject, Post } from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { eq } from 'drizzle-orm';
import { DB, type AppDb } from '../../database/database.module';
import { categories } from '../../database/schema';
import { textHints, type HintCategory, type TextHints } from './text-hints';

export class TextHintsDto {
  @ApiProperty({ example: 'Потерял чёрный кошелёк' })
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1500)
  description?: string;
}

const CACHE_MS = 60_000;

@ApiTags('ai')
@Controller({ path: 'ai', version: '1' })
export class AiController {
  private cache: { at: number; rows: HintCategory[] } | null = null;

  constructor(@Inject(DB) private readonly db: AppDb) {}

  private async categories(): Promise<HintCategory[]> {
    if (this.cache && Date.now() - this.cache.at < CACHE_MS) return this.cache.rows;
    const rows = await this.db
      .select({
        slug: categories.slug,
        nameRu: categories.nameRu,
        nameKy: categories.nameKy,
        synonyms: categories.synonyms,
      })
      .from(categories)
      .where(eq(categories.active, true));
    this.cache = { at: Date.now(), rows };
    return rows;
  }

  @Post('text-hints')
  @HttpCode(200)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Category, colour and brand understood from a typed description (RU/KY). Runs on the server, no external service.',
  })
  async hints(@Body() dto: TextHintsDto): Promise<TextHints> {
    return textHints(dto.title, dto.description ?? '', await this.categories());
  }
}
