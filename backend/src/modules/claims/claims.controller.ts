import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ClaimsService } from './claims.service';
import { AddEvidenceDto, ClaimDecisionDto, CreateClaimDto } from './claims.dto';
import { AuthGuard, assertCanAct, CurrentUser, ReqLocale } from '../../common/auth';
import type { User } from '../../database/schema';
import type { Locale } from '../../common/i18n';

@ApiTags('claims')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller({ version: '1' })
export class ClaimsController {
  constructor(private readonly claims: ClaimsService) {}

  @Post('items/:id/claims')
  @HttpCode(201)
  @Throttle({ default: { limit: 10, ttl: 3_600_000 } })
  @ApiOperation({
    summary: 'Submit an ownership claim (FOUND item) or a "maybe I found it" report (LOST item).',
  })
  create(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: CreateClaimDto,
    @ReqLocale() locale: Locale,
  ) {
    assertCanAct(user);
    return this.claims.create(user, id, dto, locale);
  }

  @Get('items/:id/claims')
  @ApiOperation({ summary: 'Claims on an item you own.' })
  forItem(@CurrentUser() user: User, @Param('id') id: string, @ReqLocale() locale: Locale) {
    return this.claims.listForItem(user, id, locale);
  }

  @Get('me/claims')
  mine(@CurrentUser() user: User, @ReqLocale() locale: Locale) {
    return this.claims.listMine(user, locale);
  }

  @Get('me/claims/incoming')
  incoming(@CurrentUser() user: User, @ReqLocale() locale: Locale) {
    return this.claims.listIncoming(user, locale);
  }

  @Get('claims/:id')
  get(@CurrentUser() user: User, @Param('id') id: string, @ReqLocale() locale: Locale) {
    return this.claims.view(id, user, locale);
  }

  @Post('claims/:id/evidence')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 3_600_000 } })
  addEvidence(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: AddEvidenceDto,
    @ReqLocale() locale: Locale,
  ) {
    assertCanAct(user);
    return this.claims.addEvidence(user, id, dto.evidence, locale);
  }

  @Post('claims/:id/withdraw')
  @HttpCode(200)
  withdraw(@CurrentUser() user: User, @Param('id') id: string, @ReqLocale() locale: Locale) {
    return this.claims.withdraw(user, id, locale);
  }

  @Post('claims/:id/decision')
  @HttpCode(200)
  decide(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: ClaimDecisionDto,
    @ReqLocale() locale: Locale,
  ) {
    assertCanAct(user);
    return this.claims.decide(user, id, dto, locale);
  }

  @Post('claims/:id/dispute')
  @HttpCode(200)
  dispute(@CurrentUser() user: User, @Param('id') id: string, @ReqLocale() locale: Locale) {
    return this.claims.dispute(user, id, locale);
  }
}
