import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './reports.dto';
import { AuthGuard, CurrentUser } from '../../common/auth';
import type { User } from '../../database/schema';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller({ path: 'reports', version: '1' })
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post()
  @HttpCode(201)
  @Throttle({ default: { limit: 10, ttl: 3_600_000 } })
  create(@CurrentUser() user: User, @Body() dto: CreateReportDto) {
    return this.reports.create(user.id, dto);
  }
}
