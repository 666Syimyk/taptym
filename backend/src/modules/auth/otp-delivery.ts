import { Injectable, Logger } from '@nestjs/common';
import type { AppConfig } from '../../config/app-config';
import { AppError } from '../../common/errors';

/**
 * Delivery adapter for one-time codes. Only the console adapter is implemented;
 * SMS/email providers are integration points (see docs/deployment.md). The server
 * refuses to start in production with the console adapter.
 */
export interface OtpDelivery {
  send(
    channel: 'phone' | 'email',
    destination: string,
    code: string,
    locale: string,
  ): Promise<void>;
}

@Injectable()
export class ConsoleOtpDelivery implements OtpDelivery {
  private readonly logger = new Logger('OTP');
  async send(channel: 'phone' | 'email', destination: string, code: string): Promise<void> {
    // Mask the destination in logs; the code is intentionally printed for local development.
    const masked =
      destination.length > 4 ? `${destination.slice(0, 3)}***${destination.slice(-2)}` : '***';
    this.logger.log(`[dev] ${channel} ${masked} → code ${code}`);
  }
}

export const OTP_DELIVERY = Symbol('OTP_DELIVERY');

/** Provider-neutral transport. The configured relay delivers SMS or email. */
export class WebhookOtpDelivery implements OtpDelivery {
  constructor(private readonly config: AppConfig['auth']) {}
  async send(
    channel: 'phone' | 'email',
    destination: string,
    code: string,
    locale: string,
  ): Promise<void> {
    try {
      const response = await fetch(this.config.otpWebhookUrl!, {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(10_000),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.otpWebhookToken}`,
        },
        body: JSON.stringify({
          channel,
          destination,
          code,
          locale,
          expiresInSeconds: this.config.otpTtlSeconds,
        }),
      });
      if (!response.ok) throw new Error('delivery failed');
    } catch {
      // Never include relay responses, destinations, codes or credentials in errors.
      throw new AppError('auth.delivery_unavailable', 503);
    }
  }
}
