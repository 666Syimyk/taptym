import { Module } from '@nestjs/common';
import { AdminAuthController, AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminGuard } from './admin.guard';
import { AdminAuditInterceptor } from './admin-audit.interceptor';

@Module({
  controllers: [AdminAuthController, AdminController],
  providers: [AdminService, AdminGuard, AdminAuditInterceptor],
  exports: [AdminService],
})
export class AdminModule {}
