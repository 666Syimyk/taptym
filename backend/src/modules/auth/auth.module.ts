import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConsoleOtpDelivery, OTP_DELIVERY, WebhookOtpDelivery } from './otp-delivery';
import { APP_CONFIG, type AppConfig } from '../../config/app-config';
import { AuthGuard } from '../../common/auth';
import { AuditModule } from '../audit/audit.module';

@Global()
@Module({
  imports: [JwtModule.register({}), AuditModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthGuard,
    {
      provide: OTP_DELIVERY,
      inject: [APP_CONFIG],
      useFactory: (cfg: AppConfig) =>
        cfg.auth.otpDelivery === 'webhook'
          ? new WebhookOtpDelivery(cfg.auth)
          : new ConsoleOtpDelivery(),
    },
  ],
  exports: [AuthService, AuthGuard, JwtModule],
})
export class AuthModule {}
