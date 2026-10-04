import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ErrorResponse, ValidationErrorItem } from '../envelope';

/**
 * Standard HTTP status to error_code mapping based on API-CONVENTIONS §4.
 */
const STATUS_TO_ERROR_CODE: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'INVALID_OPERATION',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHENTICATED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'ENTITY_NOT_FOUND',
  [HttpStatus.CONFLICT]: 'DUPLICATE_ENTITY',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'VALIDATION_ERROR',
  [HttpStatus.TOO_MANY_REQUESTS]: 'RATE_LIMITED',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_SERVER_ERROR',
};

/**
 * Catches all HttpExceptions (including ValidationPipe 422 errors and standard NestJS HTTP exceptions).
 * Preserves the HTTP status and normalizes the response body into the standard ErrorResponse envelope:
 * { detail, error_code, errors? }
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter<HttpException> {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let detail = exception.message;
    let errorCode = STATUS_TO_ERROR_CODE[status] || 'HTTP_ERROR';
    let errors: ValidationErrorItem[] | undefined;

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const respObj = exceptionResponse as Record<string, any>;

      // If already formatted with detail and error_code (e.g. from ValidationPipe exceptionFactory)
      if (respObj.detail) {
        detail = String(respObj.detail);
      } else if (respObj.message) {
        detail = Array.isArray(respObj.message)
          ? respObj.message.join(', ')
          : String(respObj.message);
      }

      if (respObj.error_code) {
        errorCode = String(respObj.error_code);
      }

      if (Array.isArray(respObj.errors)) {
        errors = respObj.errors as ValidationErrorItem[];
      }
    } else if (typeof exceptionResponse === 'string') {
      detail = exceptionResponse;
    }

    const body = new ErrorResponse(detail, errorCode, errors);
    response.status(status).json(body);
  }
}
