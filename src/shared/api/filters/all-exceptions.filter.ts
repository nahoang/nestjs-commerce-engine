import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ErrorResponse } from '../envelope';

/**
 * Catch-all exception filter for unhandled and unexpected errors (e.g. database disconnects, syntax/runtime errors).
 * Logs the stack trace for observability while preventing internal error leaks to clients by returning
 * HTTP 500 with a generic message and error_code 'INTERNAL_SERVER_ERROR' (API-CONVENTIONS §4).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof Error) {
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
      );
    } else {
      this.logger.error(`Unhandled exception: ${String(exception)}`);
    }

    const body = new ErrorResponse(
      'Internal server error',
      'INTERNAL_SERVER_ERROR',
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(body);
  }
}
