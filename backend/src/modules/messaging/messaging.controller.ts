import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { MessagingService } from './messaging.service';
import { AuthGuard, assertCanAct, CurrentUser } from '../../common/auth';
import type { User } from '../../database/schema';

class SendMessageDto {
  @IsOptional() @IsString() @MaxLength(2000) body?: string;
  @IsOptional() @IsString() @MaxLength(64) clientMessageId?: string;
  @IsOptional() @IsUUID() attachmentMediaId?: string;
}
class ReadDto {
  @IsUUID() messageId: string;
}

@ApiTags('messaging')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller({ path: 'conversations', version: '1' })
export class MessagingController {
  constructor(private readonly messaging: MessagingService) {}

  @Get()
  list(@CurrentUser() user: User) {
    return this.messaging.list(user.id);
  }

  @Get('unread-count')
  async unread(@CurrentUser() user: User) {
    return { count: await this.messaging.totalUnread(user.id) };
  }

  @Get(':id/messages')
  history(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Query('before') before?: string,
    @Query('after') after?: string,
    @Query('limit') limit?: string,
  ) {
    return this.messaging.history(id, user.id, {
      before,
      after,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post(':id/messages')
  @HttpCode(201)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  send(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: SendMessageDto) {
    assertCanAct(user);
    return this.messaging.send(
      id,
      user.id,
      dto.body ?? '',
      dto.clientMessageId,
      dto.attachmentMediaId,
    );
  }

  @Post(':id/read')
  @HttpCode(204)
  async read(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: ReadDto) {
    await this.messaging.markRead(id, user.id, dto.messageId);
  }

  @Post(':id/close')
  @HttpCode(204)
  async close(@CurrentUser() user: User, @Param('id') id: string) {
    await this.messaging.close(id, user.id);
  }
}
