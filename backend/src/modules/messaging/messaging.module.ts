import { Global, Module } from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { MessagingController } from './messaging.controller';
import { MessagingGateway } from './messaging.gateway';
import { MessagingEvents } from './messaging.events';

@Global()
@Module({
  controllers: [MessagingController],
  providers: [MessagingEvents, MessagingService, MessagingGateway],
  exports: [MessagingService],
})
export class MessagingModule {}
