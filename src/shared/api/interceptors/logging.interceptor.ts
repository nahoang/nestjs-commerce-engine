import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { ClsService } from 'nestjs-cls';

/**
 * Global logging interceptor that logs incoming requests and execution durations:
 * Format: {method} {path} → {status} in {ms}ms [requestId]
 * Logs both successful operations and thrown exceptions.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  constructor(private readonly cls?: ClsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const start = Date.now();
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const method = req.method;
    const path = req.originalUrl || req.url;
    const requestId =
      this.cls?.getId() ||
      (req.headers?.['x-request-id'] as string) ||
      'no-request-id';

    return next.handle().pipe(
      tap({
        next: () => {
          const ms = Date.now() - start;
          const status = res.statusCode || HttpStatus.OK;
          this.logger.log(
            `${method} ${path} → ${status} in ${ms}ms [${requestId}]`,
          );
        },
        error: (error: unknown) => {
          const ms = Date.now() - start;
          const status = this.resolveErrorStatus(error);
          this.logger.error(
            `${method} ${path} → ${status} in ${ms}ms [${requestId}]`,
          );
        },
      }),
    );
  }

  private resolveErrorStatus(error: unknown): number {
    if (
      typeof error === 'object' &&
      error !== null &&
      'getStatus' in error &&
      typeof error.getStatus === 'function'
    ) {
      const getStatusFn = (error as { getStatus: () => unknown }).getStatus;
      const status = getStatusFn.call(error);
      if (typeof status === 'number') {
        return status;
      }
    }

    if (typeof error === 'object' && error !== null) {
      const errObj = error as Record<string, unknown>;
      const errorCode =
        typeof errObj.errorCode === 'string' ? errObj.errorCode : undefined;

      if (errorCode === 'ENTITY_NOT_FOUND') {
        return HttpStatus.NOT_FOUND;
      }
      if (
        errorCode &&
        [
          'DUPLICATE_ENTITY',
          'INSUFFICIENT_STOCK',
          'VOUCHER_EXHAUSTED',
        ].includes(errorCode)
      ) {
        return HttpStatus.CONFLICT;
      }
      if (errorCode === 'UNAUTHENTICATED') {
        return HttpStatus.UNAUTHORIZED;
      }
      if (errorCode) {
        return HttpStatus.BAD_REQUEST;
      }
      if (typeof errObj.status === 'number') {
        return errObj.status;
      }
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }
}
