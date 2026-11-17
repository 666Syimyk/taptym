import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ItemsService } from './items.service';
import { CloseItemDto, CreateItemDto, ItemsQueryDto, UpdateItemDto } from './items.dto';
import { AuthGuard, assertCanAct, CurrentUser, OptionalAuth, ReqLocale } from '../../common/auth';
import type { User } from '../../database/schema';
import type { Locale } from '../../common/i18n';
import { MatchingService } from '../matching/matching.service';

@ApiTags('items')
@Controller({ version: '1' })
export class ItemsController {
  constructor(
    private readonly items: ItemsService,
    private readonly matching: MatchingService,
  ) {}

  @Get('items')
  @OptionalAuth()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Public feed with filters and search. Guests allowed.' })
  list(@Query() q: ItemsQueryDto, @CurrentUser() user?: User) {
    return this.items.list(q, user?.id);
  }

  @Get('items/suggest')
  @ApiOperation({ summary: 'Search autosuggestions (categories + recent titles).' })
  suggest(@Query('q') q: string, @ReqLocale() locale: Locale) {
    return this.items.suggest(q ?? '', locale);
  }

  @Get('me/items')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  async mine(@CurrentUser() user: User, @Query('status') status?: string) {
    const cards = await this.items.mine(user, status);
    const claimCounts = await this.items.withClaimsCount(user.id);
    return cards.map((c) => ({ ...c, pendingClaims: claimCounts[c.id] ?? 0 }));
  }

  @Get('items/:id')
  @OptionalAuth()
  @UseGuards(AuthGuard)
  detail(@Param('id') id: string, @CurrentUser() user?: User) {
    return this.items.detail(id, user);
  }

  @Post('items')
  @HttpCode(201)
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Throttle({ default: { limit: 20, ttl: 3_600_000 } })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description: 'Repeat-safe creation key (recommended).',
  })
  create(
    @CurrentUser() user: User,
    @Body() dto: CreateItemDto,
    @Headers('idempotency-key') idem?: string,
  ) {
    assertCanAct(user);
    return this.items.create(user, dto, idem?.slice(0, 128));
  }

  @Patch('items/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  update(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateItemDto) {
    assertCanAct(user);
    return this.items.update(user, id, dto);
  }

  @Post('items/:id/close')
  @HttpCode(200)
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  close(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: CloseItemDto) {
    return this.items.close(user, id, dto.resolution);
  }

  @Delete('items/:id')
  @HttpCode(204)
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  async remove(@CurrentUser() user: User, @Param('id') id: string) {
    await this.items.remove(user, id);
  }

  @Get('items/:id/matches')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Match suggestions for an item you own. Reasons are safe, non-numeric explanations.',
  })
  async matches(@CurrentUser() user: User, @Param('id') id: string, @ReqLocale() locale: Locale) {
    await this.items.getOwned(id, user.id);
    return this.matching.listForItem(id, locale, user.id);
  }

  @Post('items/:id/matches/:matchId/dismiss')
  @HttpCode(204)
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  async dismiss(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Param('matchId') matchId: string,
  ) {
    await this.items.getOwned(id, user.id);
    await this.matching.setStatus(matchId, id, 'DISMISSED');
  }
}
