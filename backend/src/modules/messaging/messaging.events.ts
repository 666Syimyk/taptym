import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'node:events';

export interface MessageView {
  id: string;
  conversationId: string;
  senderId: string | null;
  clientMessageId: string | null;
  kind: string;
  body: string;
  attachmentUrl: string | null;
  warnings: string[];
  createdAt: string;
  mine?: boolean;
}

/** In-process event bus between the messaging service and the WebSocket gateway. */
@Injectable()
export class MessagingEvents {
  private readonly emitter = new EventEmitter();
  emitMessage(recipients: string[], message: MessageView) {
    this.emitter.emit('message', { recipients, message });
  }
  onMessage(handler: (payload: { recipients: string[]; message: MessageView }) => void) {
    this.emitter.on('message', handler);
  }
}
