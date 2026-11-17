import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { resolveLocale, t } from './i18n';

/**
 * Structured application error. `code` is stable and machine-readable; the message
 * is localized at the edge by the filter based on Accept-Language.
 */
export class AppError extends HttpException {
  constructor(
    public readonly code: string,
    status: HttpStatus,
    public readonly details?: Record<string, unknown>,
  ) {
    super({ code, details }, status);
  }
  static notFound(code = 'error.not_found') {
    return new AppError(code, HttpStatus.NOT_FOUND);
  }
  static forbidden(code = 'error.forbidden') {
    return new AppError(code, HttpStatus.FORBIDDEN);
  }
  static unauthorized(code = 'error.unauthorized') {
    return new AppError(code, HttpStatus.UNAUTHORIZED);
  }
  static conflict(code = 'error.conflict') {
    return new AppError(code, HttpStatus.CONFLICT);
  }
  static badRequest(code: string, details?: Record<string, unknown>) {
    return new AppError(code, HttpStatus.BAD_REQUEST, details);
  }
  static tooMany(code = 'error.rate_limited') {
    return new AppError(code, HttpStatus.TOO_MANY_REQUESTS);
  }
}

export interface ErrorBody {
  code: string;
  message: string;
  status: number;
  requestId?: string;
  details?: unknown;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Http');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const locale = resolveLocale(req.headers['accept-language'] as string | undefined);
    const requestId =
      (req.headers['x-request-id'] as string | undefined) ??
      (res.getHeader('x-request-id') as string);

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'error.internal';
    let details: unknown;

    if (exception instanceof AppError) {
      status = exception.getStatus();
      code = exception.code;
      details = exception.details;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse() as any;
      if (status === HttpStatus.BAD_REQUEST) {
        code = 'error.validation';
        details = Array.isArray(body?.message) ? body.message : body?.message;
      } else if (status === HttpStatus.UNAUTHORIZED) code = 'error.unauthorized';
      else if (status === HttpStatus.FORBIDDEN) code = 'error.forbidden';
      else if (status === HttpStatus.NOT_FOUND) code = 'error.not_found';
      else if (status === HttpStatus.TOO_MANY_REQUESTS) code = 'error.rate_limited';
      else if (status === HttpStatus.CONFLICT) code = 'error.conflict';
      else if (status === HttpStatus.PAYLOAD_TOO_LARGE) code = 'media.too_large';
      else code = typeof body?.code === 'string' ? body.code : 'error.internal';
    } else {
      this.logger.error(
        `Unhandled error on ${req.method} ${req.url}: ${(exception as Error)?.message}`,
        (exception as Error)?.stack,
      );
    }

    const payload: ErrorBody = { code, message: t(code, locale), status, requestId };
    if (details !== undefined) payload.details = details;
    res.status(status).json(payload);
  }
}
