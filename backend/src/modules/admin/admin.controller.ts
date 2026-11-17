import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AdminService } from './admin.service';
import {
  AdminGuard,
  CurrentAdmin,
  Roles,
  type AdminPrincipal,
  type AdminRole,
} from './admin.guard';
import { AdminAuditInterceptor } from './admin-audit.interceptor';
import {
  AdminLoginDto,
  CaseResolveDto,
  CategoryUpsertDto,
  ClaimAdminDecisionDto,
  CreateAdminDto,
  FeatureFlagDto,
  ItemStatusDto,
  MfaEnableDto,
  NotifyUserDto,
  UserStatusDto,
} from './admin.dto';
import { ReqLocale } from '../../common/auth';
import type { Locale } from '../../common/i18n';
import { IsIn, IsString } from 'class-validator';

class FeedbackStatusDto {
  @IsIn(['NEW', 'READ', 'DONE']) status: 'NEW' | 'READ' | 'DONE';
}

class MfaEnableBodyDto extends MfaEnableDto {
  @IsString() setupToken: string;
}

@ApiTags('admin-auth')
@Controller({ path: 'admin/auth', version: '1' })
export class AdminAuthController {
  constructor(private readonly admin: AdminService) {}

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 300_000 } })
  login(@Body() dto: AdminLoginDto) {
    return this.admin.login(dto.email, dto.password, dto.totp);
  }

  @Post('mfa/setup')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 300_000 } })
  mfaSetup(@Body() dto: AdminLoginDto) {
    return this.admin.mfaSetup(dto.email, dto.password);
  }

  @Post('mfa/enable')
  @HttpCode(200)
  mfaEnable(@Body() dto: MfaEnableBodyDto) {
    return this.admin.mfaEnable(dto.setupToken, dto.code);
  }
}

const READ_ALL: AdminRole[] = [
  'SUPER_ADMIN',
  'MODERATOR',
  'SUPPORT',
  'SECURITY_ANALYST',
  'READONLY_ANALYST',
];
const MOD: AdminRole[] = ['SUPER_ADMIN', 'MODERATOR'];
const MOD_SEC: AdminRole[] = ['SUPER_ADMIN', 'MODERATOR', 'SECURITY_ANALYST'];
const SUPPORT_MOD_SEC: AdminRole[] = ['SUPER_ADMIN', 'MODERATOR', 'SUPPORT', 'SECURITY_ANALYST'];

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@UseInterceptors(AdminAuditInterceptor)
@Controller({ path: 'admin', version: '1' })
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('me') me(@CurrentAdmin() admin: AdminPrincipal) {
    return admin;
  }

  @Get('overview') @Roles(...READ_ALL) overview() {
    return this.admin.overview();
  }
  @Get('analytics') @Roles(...READ_ALL) analytics(@Query('days') days?: string) {
    return this.admin.analytics(days ? Number(days) : 14);
  }

  // items
  @Get('items') @Roles(...READ_ALL) items(
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
  ) {
    return this.admin.listItems({ status, q, limit: limit ? Number(limit) : undefined });
  }
  @Get('items/:id') @Roles(...SUPPORT_MOD_SEC) item(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminPrincipal,
  ) {
    return this.admin.itemDetail(id, admin);
  }
  @Post('items/:id/status') @HttpCode(200) @Roles(...MOD) itemStatus(
    @CurrentAdmin() admin: AdminPrincipal,
    @Param('id') id: string,
    @Body() dto: ItemStatusDto,
  ) {
    return this.admin.setItemStatus(admin, id, dto.status, dto.note);
  }

  // cases
  @Get('cases') @Roles(...SUPPORT_MOD_SEC) cases(
    @Query('status') status?: string,
    @Query('kind') kind?: string,
  ) {
    return this.admin.listCases({ status, kind });
  }
  @Post('cases/:id/assign') @HttpCode(200) @Roles(...MOD_SEC) assign(
    @CurrentAdmin() admin: AdminPrincipal,
    @Param('id') id: string,
  ) {
    return this.admin.assignCase(admin, id);
  }
  @Post('cases/:id/resolve') @HttpCode(200) @Roles(...MOD_SEC) resolve(
    @CurrentAdmin() admin: AdminPrincipal,
    @Param('id') id: string,
    @Body() dto: CaseResolveDto,
  ) {
    return this.admin.resolveCase(admin, id, dto.resolution);
  }

  // claims
  @Get('claims') @Roles(...MOD_SEC) claims(@Query('status') status?: string) {
    return this.admin.listClaims(status);
  }
  @Get('claims/:id') @Roles(...MOD_SEC) claim(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminPrincipal,
  ) {
    return this.admin.claimDetail(id, admin);
  }
  @Post('claims/:id/decision') @HttpCode(200) @Roles(...MOD) decideClaim(
    @CurrentAdmin() admin: AdminPrincipal,
    @Param('id') id: string,
    @Body() dto: ClaimAdminDecisionDto,
    @ReqLocale() locale: Locale,
  ) {
    return this.admin.decideClaim(admin, id, dto.status, dto.note, locale);
  }

  // users
  @Get('users') @Roles(...SUPPORT_MOD_SEC) users(
    @CurrentAdmin() admin: AdminPrincipal,
    @Query('q') q?: string,
    @Query('status') status?: string,
  ) {
    return this.admin.listUsers({ q, status }, admin);
  }
  @Get('users/:id') @Roles(...SUPPORT_MOD_SEC) user(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminPrincipal,
  ) {
    return this.admin.userDetail(id, admin);
  }
  @Post('users/:id/status') @HttpCode(200) @Roles(...MOD_SEC) userStatus(
    @CurrentAdmin() admin: AdminPrincipal,
    @Param('id') id: string,
    @Body() dto: UserStatusDto,
  ) {
    return this.admin.setUserStatus(admin, id, dto.status, dto.until, dto.reason);
  }
  @Post('notify') @HttpCode(200) @Roles(...SUPPORT_MOD_SEC) notify(@Body() dto: NotifyUserDto) {
    return this.admin.notifyUser(dto.userId, dto.note);
  }

  // reference data
  // comments under listings
  @Get('comments') @Roles(...SUPPORT_MOD_SEC) comments(
    @Query('status') status?: string,
    @Query('q') q?: string,
  ) {
    return this.admin.listComments({ status, q });
  }
  @Post('comments/:id/remove') @HttpCode(200) @Roles(...MOD) removeComment(
    @CurrentAdmin() admin: AdminPrincipal,
    @Param('id') id: string,
  ) {
    return this.admin.removeComment(admin, id);
  }

  // feedback about the platform
  @Get('feedback') @Roles(...READ_ALL) feedback(@Query('status') status?: string) {
    return this.admin.listFeedback({ status });
  }
  @Post('feedback/:id/status') @HttpCode(200) @Roles(...SUPPORT_MOD_SEC) feedbackStatus(
    @Param('id') id: string,
    @Body() dto: FeedbackStatusDto,
  ) {
    return this.admin.setFeedbackStatus(id, dto.status);
  }

  @Get('categories') @Roles(...READ_ALL) categories() {
    return this.admin.listCategories();
  }
  @Post('categories') @Roles('SUPER_ADMIN') createCategory(@Body() dto: CategoryUpsertDto) {
    return this.admin.createCategory(dto);
  }
  @Patch('categories/:id') @Roles('SUPER_ADMIN', 'MODERATOR') updateCategory(
    @Param('id') id: string,
    @Body() dto: CategoryUpsertDto,
  ) {
    return this.admin.updateCategory(id, dto);
  }
  @Get('feature-flags') @Roles(...READ_ALL) flags() {
    return this.admin.listFlags();
  }
  @Patch('feature-flags/:key') @Roles('SUPER_ADMIN') setFlag(
    @Param('key') key: string,
    @Body() dto: FeatureFlagDto,
  ) {
    return this.admin.setFlag(key, dto.enabled);
  }

  // security
  @Get('audit') @Roles('SUPER_ADMIN', 'SECURITY_ANALYST') audit(@Query('limit') limit?: string) {
    return this.admin.listAudit(limit ? Number(limit) : 200);
  }
  @Get('risk-events') @Roles('SUPER_ADMIN', 'SECURITY_ANALYST') risk(
    @Query('limit') limit?: string,
  ) {
    return this.admin.listRiskEvents(limit ? Number(limit) : 200);
  }
  @Get('admins') @Roles('SUPER_ADMIN') admins() {
    return this.admin.listAdmins();
  }
  @Post('admins') @Roles('SUPER_ADMIN') createAdmin(@Body() dto: CreateAdminDto) {
    return this.admin.createAdmin(dto.email, dto.password, dto.role as AdminRole);
  }
}
