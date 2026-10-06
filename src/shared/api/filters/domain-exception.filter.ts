import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import {
  DomainException,
  EntityNotFoundException,
  DuplicateEntityException,
  InsufficientStockException,
  InvalidValueException,
} from '../../domain/exceptions';
import { ErrorResponse } from '../envelope';

/**
 * Catches DomainExceptions thrown from application or domain layers and
 * translates them into HTTP 4xx responses according to API-CONVENTIONS §4.
 *
 * Mapping rules:
 * - EntityNotFoundException or errorCode 'ENTITY_NOT_FOUND' -> 404 NOT_FOUND
 * - DuplicateEntityException, InsufficientStockException, or errorCodes
 *   'DUPLICATE_ENTITY', 'INSUFFICIENT_STOCK', 'VOUCHER_EXHAUSTED' -> 409 CONFLICT
 * - InvalidValueException (value object invariant) -> 422 UNPROCESSABLE_ENTITY, with
 *   an `errors` item when the offending field is known
 * - InvalidOperationException or other domain violations -> 400 BAD_REQUEST
 */
@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter<DomainException> {
  catch(exception: DomainException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status = this.resolveHttpStatus(exception);
    const body =
      exception instanceof InvalidValueException && exception.field
        ? new ErrorResponse(exception.message, exception.errorCode, [
            { field: exception.field, message: exception.message },
          ])
        : new ErrorResponse(exception.message, exception.errorCode);

    response.status(status).json(body);
  }

  private resolveHttpStatus(exception: DomainException): number {
    if (
      exception instanceof EntityNotFoundException ||
      exception.errorCode === 'ENTITY_NOT_FOUND'
    ) {
      return HttpStatus.NOT_FOUND;
    }

    if (exception instanceof InvalidValueException) {
      return HttpStatus.UNPROCESSABLE_ENTITY;
    }

    if (
      exception instanceof DuplicateEntityException ||
      exception instanceof InsufficientStockException ||
      exception.errorCode === 'DUPLICATE_ENTITY' ||
      exception.errorCode === 'INSUFFICIENT_STOCK' ||
      exception.errorCode === 'VOUCHER_EXHAUSTED'
    ) {
      return HttpStatus.CONFLICT;
    }

    return HttpStatus.BAD_REQUEST;
  }
}
