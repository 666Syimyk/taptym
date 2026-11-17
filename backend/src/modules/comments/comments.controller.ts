import { Body, Controller, Delete, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsString, Length } from 'class-validator';
import { AuthGuard, assertCanAct, CurrentUser, OptionalAuth } from '../../common/auth';
import type { User } from '../../database/schema';
import { CommentsService } from './comments.service';

export class CreateCommentDto {
  @ApiProperty({ maxLength: 500 }) @IsString() @Length(1, 500) body: string;
}

@ApiTags('comments')
@Controller({ version: '1' })
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Get('items/:id/comments')
  @OptionalAuth()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Public comments under a listing. Guests allowed.' })
  list(@Param('id') id: string, @CurrentUser() user?: User) {
    return this.comments.list(id, user?.id);
  }

  @Post('items/:id/comments')
  @HttpCode(201)
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  create(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: CreateCommentDto) {
    assertCanAct(user);
    return this.comments.create(user, id, dto.body);
  }

  @Delete('comments/:id')
  @HttpCode(204)
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Delete your comment, or any comment under your listing.' })
  async remove(@CurrentUser() user: User, @Param('id') id: string) {
    await this.comments.remove(user, id);
  }
}
