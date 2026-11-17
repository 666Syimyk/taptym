/**
 * Authentication primitives shared across modules:
 * - AuthGuard: validates the access JWT and loads the account (status aware).
 * - OptionalAuth: lets guests through, attaches the user when a valid token is present.
 * - CurrentUser / Locale decorators.
 */
import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Inject,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { createHmac } from 'node:crypto';
import { AppError } from './errors';
import { Locale, resolveLocale } from './i18n';
import { DB, type AppDb } from '../database/database.module';
import { deviceSessions, users, type User } from '../database/schema';
import { APP_CONFIG, type AppConfig } from '../config/app-config';

export interface AccessTokenPayload {
  sub: string; // user id
  sid: string; // device session id
  typ: 'access';
}

export interface AuthedRequest extends Request {
  user?: User;
  sessionId?: string;
  locale: Locale;
}

export const OPTIONAL_AUTH = 'optionalAuth';
export const OptionalAuth = () => SetMetadata(OPTIONAL_AUTH, true);

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    @Inject(DB) private readonly db: AppDb,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    req.locale = resolveLocale(req.headers['accept-language'] as string | undefined);
    const optional = this.reflector.getAllAndOverride<boolean>(OPTIONAL_AUTH, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      if (optional) return true;
      throw AppError.unauthorized();
    }
    let payload: AccessTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, {
        secret: this.cfg.auth.accessSecret,
      });
    } catch {
      if (optional) return true;
      throw AppError.unauthorized('auth.session_invalid');
    }
    if (payload.typ !== 'access') throw AppError.unauthorized('auth.session_invalid');
    const [session] = await this.db
      .select({ id: deviceSessions.id })
      .from(deviceSessions)
      .where(
        and(
          eq(deviceSessions.id, payload.sid),
          eq(deviceSessions.userId, payload.sub),
          isNull(deviceSessions.revokedAt),
          gt(deviceSessions.expiresAt, new Date()),
        ),
      );
    if (!session) {
      if (optional) return true;
      throw AppError.unauthorized('auth.session_invalid');
    }
    const [user] = await this.db.select().from(users).where(eq(users.id, payload.sub));
    if (!user || user.accountStatus === 'DELETED') {
      if (optional) return true;
      throw AppError.unauthorized('auth.session_invalid');
    }
    if (user.accountStatus === 'BANNED') throw AppError.forbidden('error.account_banned');
    req.user = user;
    req.sessionId = payload.sid;
    if (user.locale !== req.locale && !req.headers['accept-language'])
      req.locale = user.locale as Locale;
    return true;
  }
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): User | undefined => {
    return ctx.switchToHttp().getRequest<AuthedRequest>().user;
  },
);

export const SessionId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    return ctx.switchToHttp().getRequest<AuthedRequest>().sessionId;
  },
);

export const ReqLocale = createParamDecorator((_data: unknown, ctx: ExecutionContext): Locale => {
  const req = ctx.switchToHttp().getRequest<AuthedRequest>();
  return req.locale ?? resolveLocale(req.headers['accept-language'] as string | undefined);
});

/** Throws when the account is temporarily restricted (risk engine / moderator). */
export function assertCanAct(user: User): void {
  if (user.accountStatus === 'BANNED') throw AppError.forbidden('error.account_banned');
  if (user.accountStatus === 'RESTRICTED') {
    if (!user.restrictedUntil || user.restrictedUntil.getTime() > Date.now()) {
      throw AppError.forbidden('error.account_restricted');
    }
  }
}

export function requireUser(user: User | undefined): User {
  if (!user) throw AppError.unauthorized();
  return user;
}

export function clientIpHash(req: Request, secret: string): string {
  const ip =
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ||
    req.ip ||
    'unknown';
  // Hash with a secret so logs cannot be trivially reversed to an IP
  return createHmac('sha256', secret).update(ip).digest('hex').slice(0, 32);
}
