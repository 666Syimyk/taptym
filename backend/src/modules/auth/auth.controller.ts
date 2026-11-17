import { Body, Controller, HttpCode, Inject, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import {
  AuthStartDto,
  AuthStartResponse,
  AuthVerifyDto,
  GuestDto,
  RefreshDto,
  TokenPairResponse,
} from './auth.dto';
import { AuthGuard, clientIpHash, ReqLocale, SessionId } from '../../common/auth';
import type { Locale } from '../../common/i18n';
import { APP_CONFIG, type AppConfig } from '../../config/app-config';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
  ) {}

  @Post('start')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Send a one-time code to a phone or email. Response never reveals whether an account exists.',
  })
  @ApiOkResponse({ type: AuthStartResponse })
  start(@Body() dto: AuthStartDto, @ReqLocale() locale: Locale, @Req() req: Request) {
    return this.auth.start(
      dto.channel,
      dto.destination,
      locale,
      clientIpHash(req, this.cfg.auth.otpHmacSecret),
    );
  }

  @Post('guest')
  @HttpCode(201)
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  @ApiOperation({
    summary:
      'Create an anonymous device account so people can post a find right away. ' +
      'Verifying a phone/email later (auth/verify with guestRefreshToken) keeps everything.',
  })
  @ApiOkResponse({ type: TokenPairResponse })
  guest(@Body() dto: GuestDto, @ReqLocale() locale: Locale) {
    return this.auth.guest({
      deviceName: dto.deviceName,
      platform: dto.platform,
      locale: dto.locale ?? locale,
    });
  }

  @Post('verify')
  @HttpCode(200)
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  @ApiOperation({ summary: 'Verify the code; creates a minimal account on first login.' })
  @ApiOkResponse({ type: TokenPairResponse })
  verify(@Body() dto: AuthVerifyDto, @ReqLocale() locale: Locale) {
    return this.auth.verify(dto.challengeId, dto.code, {
      deviceName: dto.deviceName,
      platform: dto.platform,
      locale: dto.locale ?? locale,
      guestRefreshToken: dto.guestRefreshToken,
    });
  }

  @Post('refresh')
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOkResponse({ type: TokenPairResponse })
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(204)
  @UseGuards(AuthGuard)
  async logout(@SessionId() sessionId: string) {
    await this.auth.logout(sessionId);
  }
}
