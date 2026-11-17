import { Inject, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { IncomingMessage } from 'node:http';
import type { Server, WebSocket } from 'ws';
import { and, eq, gt, inArray, isNull } from 'drizzle-orm';
import { APP_CONFIG, type AppConfig } from '../../config/app-config';
import type { AccessTokenPayload } from '../../common/auth';
import { DB, type AppDb } from '../../database/database.module';
import { deviceSessions, users } from '../../database/schema';
import { MessagingService } from './messaging.service';
import { MessagingEvents } from './messaging.events';

interface AuthedSocket extends WebSocket {
  userId?: string;
  isAlive?: boolean;
  sessionId?: string;
  expiresAt?: number;
}

/**
 * WebSocket chat transport (PRD §22.5): token checked on connect, per-conversation
 * authorization enforced by the service, client message ids for deduplication,
 * explicit acks, and REST history for recovery after a dropped connection.
 *
 * Protocol (JSON frames):
 *   → {type:"send", conversationId, clientMessageId, body, attachmentMediaId?}
 *   ← {type:"ack", clientMessageId, message}
 *   ← {type:"message", message}          (new message in any of my conversations)
 *   → {type:"ping"}  ← {type:"pong"}
 *   ← {type:"error", code, clientMessageId?}
 */
@WebSocketGateway({ path: '/ws' })
export class MessagingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger('WS');
  private readonly sockets = new Map<string, Set<AuthedSocket>>();

  constructor(
    private readonly jwt: JwtService,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
    @Inject(DB) private readonly db: AppDb,
    private readonly messaging: MessagingService,
    events: MessagingEvents,
  ) {
    events.onMessage(({ recipients, message }) => {
      for (const uid of recipients) {
        for (const s of this.sockets.get(uid) ?? []) {
          void this.validSession(s, uid)
            .then((valid) => {
              if (!valid) {
                s.close(4401, 'unauthorized');
                return;
              }
              this.safeSend(s, {
                type: 'message',
                message: { ...message, mine: message.senderId === uid },
              });
            })
            .catch(() => s.close(1011, 'session check failed'));
        }
      }
    });
  }

  async handleConnection(client: AuthedSocket, req: IncomingMessage) {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const token =
        url.searchParams.get('token') ??
        (req.headers['sec-websocket-protocol'] as string | undefined)?.replace('bearer.', '');
      if (!token) return client.close(4401, 'unauthorized');
      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, {
        secret: this.cfg.auth.accessSecret,
      });
      if (payload.typ !== 'access') return client.close(4401, 'unauthorized');
      client.sessionId = payload.sid;
      client.expiresAt = (payload as AccessTokenPayload & { exp: number }).exp * 1000;
      if (!(await this.validSession(client, payload.sub)))
        return client.close(4401, 'unauthorized');
      const [user] = await this.db.select().from(users).where(eq(users.id, payload.sub));
      if (!user || user.accountStatus === 'DELETED' || user.accountStatus === 'BANNED')
        return client.close(4403, 'forbidden');
      client.userId = user.id;
      client.isAlive = true;
      if (!this.sockets.has(user.id)) this.sockets.set(user.id, new Set());
      this.sockets.get(user.id)!.add(client);
      this.messaging.online.set(user.id, this.sockets.get(user.id)!.size);
      client.on('message', (raw) => void this.onFrame(client, raw.toString()));
      client.on('pong', () => (client.isAlive = true));
      this.safeSend(client, { type: 'ready' });
    } catch {
      client.close(4401, 'unauthorized');
    }
  }

  handleDisconnect(client: AuthedSocket) {
    if (!client.userId) return;
    const set = this.sockets.get(client.userId);
    set?.delete(client);
    if (set && set.size === 0) this.sockets.delete(client.userId);
    this.messaging.online.set(client.userId, set?.size ?? 0);
  }

  private async onFrame(client: AuthedSocket, raw: string) {
    let frame: any;
    try {
      frame = JSON.parse(raw);
    } catch {
      return this.safeSend(client, { type: 'error', code: 'error.validation' });
    }
    if (!client.userId) return;
    if (!(await this.validSession(client, client.userId)))
      return client.close(4401, 'unauthorized');
    if (frame?.type === 'ping') return this.safeSend(client, { type: 'pong' });
    if (frame?.type === 'send') {
      try {
        const message = await this.messaging.send(
          String(frame.conversationId ?? ''),
          client.userId,
          String(frame.body ?? ''),
          frame.clientMessageId ? String(frame.clientMessageId).slice(0, 64) : undefined,
          frame.attachmentMediaId ? String(frame.attachmentMediaId) : undefined,
        );
        return this.safeSend(client, {
          type: 'ack',
          clientMessageId: frame.clientMessageId ?? null,
          message,
        });
      } catch (e: any) {
        return this.safeSend(client, {
          type: 'error',
          code: e?.code ?? 'error.internal',
          clientMessageId: frame.clientMessageId ?? null,
        });
      }
    }
    this.safeSend(client, { type: 'error', code: 'error.validation' });
  }

  private async validSession(client: AuthedSocket, userId: string): Promise<boolean> {
    if (!client.sessionId || !client.expiresAt || client.expiresAt <= Date.now()) return false;
    const [session] = await this.db
      .select({ id: deviceSessions.id })
      .from(deviceSessions)
      .innerJoin(users, eq(users.id, deviceSessions.userId))
      .where(
        and(
          eq(deviceSessions.id, client.sessionId),
          eq(deviceSessions.userId, userId),
          isNull(deviceSessions.revokedAt),
          gt(deviceSessions.expiresAt, new Date()),
          inArray(users.accountStatus, ['ACTIVE', 'RESTRICTED']),
        ),
      );
    return Boolean(session);
  }

  private safeSend(socket: WebSocket, data: unknown) {
    try {
      if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(data));
    } catch (e) {
      this.logger.debug(`send failed: ${(e as Error).message}`);
    }
  }
}
