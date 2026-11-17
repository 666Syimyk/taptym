import { Global, Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { ConsolePushAdapter, PUSH_ADAPTER } from './push.adapter';

@Global()
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, { provide: PUSH_ADAPTER, useClass: ConsolePushAdapter }],
  exports: [NotificationsService],
})
export class NotificationsModule {}
