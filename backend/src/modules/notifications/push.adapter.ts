import { Injectable, Logger } from '@nestjs/common';

export interface PushMessage {
  title: string;
  body: string;
  deepLink?: string;
  /** Collapse key so a flood of chat messages shows once on the lock screen. */
  collapseKey?: string;
}

/**
 * Push transport. The console adapter logs what would be sent. An FCM adapter is an
 * integration point (requires a Firebase service account) — see docs/deployment.md.
 * Push payloads never include evidence, hidden features or message bodies (PRD §20.2).
 */
export interface PushAdapter {
  send(tokens: string[], message: PushMessage): Promise<void>;
}

@Injectable()
export class ConsolePushAdapter implements PushAdapter {
  private readonly logger = new Logger('Push');
  async send(tokens: string[], message: PushMessage): Promise<void> {
    if (tokens.length === 0) return;
    this.logger.debug(`push → ${tokens.length} device(s): ${message.title} — ${message.body}`);
  }
}

export const PUSH_ADAPTER = Symbol('PUSH_ADAPTER');
