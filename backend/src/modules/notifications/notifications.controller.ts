import { Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { AuthGuard, CurrentUser, ReqLocale } from '../../common/auth';
import type { User } from '../../database/schema';
import type { Locale } from '../../common/i18n';
import { clampLimit } from '../../common/pagination';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller({ path: 'notifications', version: '1' })
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  list(
    @CurrentUser() user: User,
    @ReqLocale() locale: Locale,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.list(user.id, locale, cursor, clampLimit(limit));
  }

  @Get('unread-count')
  async unread(@CurrentUser() user: User) {
    return { count: await this.service.unreadCount(user.id) };
  }

  @Post('read-all')
  @HttpCode(204)
  async readAll(@CurrentUser() user: User) {
    await this.service.markRead(user.id);
  }

  @Post(':id/read')
  @HttpCode(204)
  async read(@CurrentUser() user: User, @Param('id') id: string) {
    await this.service.markRead(user.id, id);
  }
}
