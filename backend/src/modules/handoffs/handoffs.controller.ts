import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, Length, MaxLength } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { HandoffsService } from './handoffs.service';
import { AuthGuard, assertCanAct, CurrentUser, ReqLocale } from '../../common/auth';
import type { User } from '../../database/schema';
import type { Locale } from '../../common/i18n';

class CreateHandoffDto {
  @IsUUID() claimId: string;
  @IsIn(['meeting', 'other']) method: 'meeting' | 'other';
  @IsOptional() @IsString() @MaxLength(200) placeNote?: string;
}
class ConfirmHandoffDto {
  @IsOptional() @IsString() @Length(4, 12) code?: string;
}

@ApiTags('handoffs')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller({ version: '1' })
export class HandoffsController {
  constructor(private readonly handoffs: HandoffsService) {}

  @Post('handoffs')
  @HttpCode(201)
  @ApiOperation({
    summary:
      'Propose a handoff for a plausible claim. The holder receives a one-time confirmation code.',
  })
  create(@CurrentUser() user: User, @Body() dto: CreateHandoffDto, @ReqLocale() locale: Locale) {
    assertCanAct(user);
    return this.handoffs.create(user, dto.claimId, dto.method, dto.placeNote, locale);
  }

  @Get('handoffs/:id')
  get(@CurrentUser() user: User, @Param('id') id: string, @ReqLocale() locale: Locale) {
    return this.handoffs.view(id, user, locale);
  }

  @Get('claims/:claimId/handoff')
  forClaim(
    @CurrentUser() user: User,
    @Param('claimId') claimId: string,
    @ReqLocale() locale: Locale,
  ) {
    return this.handoffs.forClaim(user, claimId, locale);
  }

  @Post('handoffs/:id/confirm')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 600_000 } })
  @ApiOperation({
    summary: 'Confirm the handoff. Receiver may pass the holder code (single-use, expiring).',
  })
  confirm(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: ConfirmHandoffDto,
    @ReqLocale() locale: Locale,
  ) {
    return this.handoffs.confirm(user, id, dto.code, locale);
  }

  @Post('handoffs/:id/dispute')
  @HttpCode(200)
  dispute(@CurrentUser() user: User, @Param('id') id: string, @ReqLocale() locale: Locale) {
    return this.handoffs.dispute(user, id, locale);
  }
}
