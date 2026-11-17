import {
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { MediaService } from './media.service';
import { AuthGuard, assertCanAct, CurrentUser } from '../../common/auth';
import type { User } from '../../database/schema';
import { AppError } from '../../common/errors';

@ApiTags('media')
@Controller({ path: 'media', version: '1' })
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post('upload-session')
  @HttpCode(201)
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Create an upload session (step 1 of 2).' })
  createSession(@CurrentUser() user: User) {
    assertCanAct(user);
    return this.media.createUploadSession(user.id);
  }

  @Post(':id/upload')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 12 * 1024 * 1024, files: 1 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        categorySlug: {
          type: 'string',
          description: 'Optional: applies category publication policy',
        },
        suggestions: { type: 'string', description: '"false" to skip AI suggestions' },
        listingType: {
          type: 'string',
          enum: ['LOST', 'FOUND'],
          description: 'Words the suggested title as lost or found (default FOUND)',
        },
      },
    },
  })
  @ApiOperation({
    summary:
      'Upload the image bytes (step 2 of 2). Returns processing result and safe suggestions.',
  })
  upload(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Query('categorySlug') categorySlug?: string,
    @Query('suggestions') suggestions?: string,
    @Query('listingType') listingType?: string,
  ) {
    assertCanAct(user);
    if (!file?.buffer) throw AppError.badRequest('media.invalid_file');
    return this.media.upload(
      id,
      user.id,
      file.buffer,
      categorySlug,
      suggestions !== 'false',
      listingType === 'LOST' ? 'LOST' : 'FOUND',
    );
  }

  @Get(':id/status')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  status(@CurrentUser() user: User, @Param('id') id: string) {
    return this.media.status(id, user.id);
  }

  @Get('public/:key')
  @ApiOperation({ summary: 'Serve a public (safe) image variant. Local and db storage drivers.' })
  async servePublic(@Param('key') key: string, @Res() res: Response) {
    const buf = await this.media.readPublic(key);
    if (!buf) throw new NotFoundException();
    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'no-store');
    res.send(buf);
  }

  @Get('preview/:key')
  async servePreview(
    @Param('key') key: string,
    @Query('exp') exp: string,
    @Query('sig') sig: string,
    @Res() res: Response,
  ) {
    const buf = await this.media.readPreview(key, exp ?? '', sig ?? '');
    if (!buf) throw new NotFoundException();
    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(buf);
  }

  @Get('protected/:key')
  @ApiOperation({ summary: 'Serve a protected original through a signed, short-lived link.' })
  async serveProtected(
    @Param('key') key: string,
    @Query('exp') exp: string,
    @Query('sig') sig: string,
    @Res() res: Response,
  ) {
    const buf = await this.media.readProtected(key, exp ?? '', sig ?? '');
    if (!buf) throw new NotFoundException();
    res.setHeader('Content-Type', key.endsWith('.png') ? 'image/png' : 'image/jpeg');
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(buf);
  }
}
