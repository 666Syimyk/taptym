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
import { eq } from 'drizzle-orm';
import { AppError } from '../../common/errors';
import { DB, type AppDb } from '../../database/database.module';
import { adminUsers } from '../../database/schema';
import { APP_CONFIG, type AppConfig } from '../../config/app-config';

export type AdminRole =
  'SUPER_ADMIN' | 'MODERATOR' | 'SUPPORT' | 'SECURITY_ANALYST' | 'READONLY_ANALYST';
export interface AdminPrincipal {
  id: string;
  email: string;
  role: AdminRole;
}
export interface AdminTokenPayload {
  sub: string;
  role: AdminRole;
  typ: 'admin';
}

const ROLES_KEY = 'adminRoles';
/** Restricts a handler to the listed roles. SUPER_ADMIN always passes. */
export const Roles = (...roles: AdminRole[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    @Inject(DB) private readonly db: AppDb,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request & { admin?: AdminPrincipal }>();
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw AppError.unauthorized('auth.session_invalid');
    let payload: AdminTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<AdminTokenPayload>(token, {
        secret: this.cfg.admin.jwtSecret,
      });
    } catch {
      throw AppError.unauthorized('auth.session_invalid');
    }
    if (payload.typ !== 'admin') throw AppError.unauthorized('auth.session_invalid');
    const [admin] = await this.db.select().from(adminUsers).where(eq(adminUsers.id, payload.sub));
    if (!admin || !admin.active) throw AppError.unauthorized('auth.session_invalid');
    req.admin = { id: admin.id, email: admin.email, role: admin.role };
    const roles = this.reflector.getAllAndOverride<AdminRole[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (roles?.length && admin.role !== 'SUPER_ADMIN' && !roles.includes(admin.role))
      throw AppError.forbidden();
    return true;
  }
}

export const CurrentAdmin = createParamDecorator(
  (_d: unknown, ctx: ExecutionContext): AdminPrincipal => {
    return (ctx.switchToHttp().getRequest() as any).admin;
  },
);
