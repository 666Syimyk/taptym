import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AccountsService } from './accounts.service';
import { ConsentDto, PushTokenDto, UpdateMeDto } from './accounts.dto';
import { AuthGuard, CurrentUser, ReqLocale, SessionId } from '../../common/auth';
import type { User } from '../../database/schema';
import type { Locale } from '../../common/i18n';
import { AuthService } from '../auth/auth.service';

@ApiTags('accounts')
@Controller({ version: '1' })
export class AccountsController {
  constructor(
    private readonly accounts: AccountsService,
    private readonly auth: AuthService,
  ) {}

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: User) {
    return this.accounts.me(user);
  }

  @Patch('me')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  update(@CurrentUser() user: User, @Body() dto: UpdateMeDto) {
    return this.accounts.update(user, dto);
  }

  @Delete('me')
  @HttpCode(204)
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  async remove(@CurrentUser() user: User, @ReqLocale() locale: Locale) {
    await this.accounts.deleteAccount(user, locale);
  }

  @Put('me/push-token')
  @HttpCode(204)
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  async pushToken(@CurrentUser() user: User, @SessionId() sid: string, @Body() dto: PushTokenDto) {
    await this.accounts.setPushToken(user.id, sid, dto.pushToken ?? null);
  }

  @Get('me/sessions')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  sessions(@CurrentUser() user: User, @SessionId() sid: string) {
    return this.accounts.listSessions(user.id, sid);
  }

  @Delete('me/sessions/:id')
  @HttpCode(204)
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  async revokeSession(@CurrentUser() user: User, @Param('id') id: string) {
    await this.accounts.revokeSession(user.id, id);
  }

  @Post('me/sessions/revoke-all')
  @HttpCode(204)
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  async revokeAll(@CurrentUser() user: User) {
    await this.auth.revokeAllSessions(user.id);
  }

  @Post('me/consents')
  @HttpCode(204)
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  async consent(@CurrentUser() user: User, @Body() dto: ConsentDto) {
    await this.accounts.recordConsent(user.id, dto.consentType, dto.version, dto.granted);
  }

  @Post('users/:id/block')
  @HttpCode(204)
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  async block(@CurrentUser() user: User, @Param('id') id: string) {
    await this.accounts.block(user.id, id);
  }

  @Delete('users/:id/block')
  @HttpCode(204)
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  async unblock(@CurrentUser() user: User, @Param('id') id: string) {
    await this.accounts.unblock(user.id, id);
  }

  @Get('users/:id/public')
  publicProfile(@Param('id') id: string) {
    return this.accounts.publicProfile(id);
  }
}
