import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import type { Request } from 'express';
import { AuditService } from '../audit/audit.service';
import type { AdminPrincipal } from './admin.guard';

/** Every mutating admin call is written to the audit log (PRD §21.3). */
@Injectable()
export class AdminAuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<Request & { admin?: AdminPrincipal }>();
    if (req.method === 'GET' || !req.admin) return next.handle();
    const admin = req.admin;
    const body = sanitize(req.body);
    return next.handle().pipe(
      tap({
        next: () =>
          void this.audit.log({
            actorType: 'admin',
            actorId: admin.id,
            action: `admin.${req.method.toLowerCase()} ${req.route?.path ?? req.path}`,
            targetType: typeof req.params?.id === 'string' ? 'param' : undefined,
            targetId: typeof req.params?.id === 'string' ? req.params.id : undefined,
            metadata: { body, role: admin.role },
          }),
      }),
    );
  }
}

function sanitize(body: unknown): Record<string, unknown> | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
    if (/password|totp|secret|token/i.test(k)) out[k] = '[redacted]';
    else out[k] = typeof v === 'string' && v.length > 200 ? v.slice(0, 200) + '…' : v;
  }
  return out;
}
