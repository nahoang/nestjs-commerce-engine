import {
  ArgumentsHost,
  HttpStatus,
  NotFoundException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Response } from 'express';
import { DomainExceptionFilter } from './domain-exception.filter';
import { HttpExceptionFilter } from './http-exception.filter';
import { AllExceptionsFilter } from './all-exceptions.filter';
import {
  EntityNotFoundException,
  DuplicateEntityException,
  InsufficientStockException,
  InvalidOperationException,
  InvalidValueException,
} from '../../domain/exceptions';

function createMockHost(): {
  host: ArgumentsHost;
  mockResponse: Response;
  statusMock: jest.Mock;
  jsonMock: jest.Mock;
} {
  const jsonMock = jest.fn();
  const statusMock = jest.fn();
  statusMock.mockReturnValue({ json: jsonMock });
  const mockResponse = {
    status: statusMock,
    json: jsonMock,
  } as unknown as Response;

  const host: ArgumentsHost = {
    switchToHttp: () => ({
      getResponse: () => mockResponse,
      getRequest: jest.fn(),
      getNext: jest.fn(),
    }),
  } as unknown as ArgumentsHost;

  return { host, mockResponse, statusMock, jsonMock };
}

describe('Exception Filters Unit Tests', () => {
  describe('DomainExceptionFilter', () => {
    let filter: DomainExceptionFilter;

    beforeEach(() => {
      filter = new DomainExceptionFilter();
    });

    it('should translate EntityNotFoundException to HTTP 404 with ENTITY_NOT_FOUND', () => {
      const { host, statusMock, jsonMock } = createMockHost();
      const exception = new EntityNotFoundException('Product', 'prod-1');

      filter.catch(exception, host);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(jsonMock).toHaveBeenCalledWith({
        detail: "Product with id 'prod-1' not found",
        error_code: 'ENTITY_NOT_FOUND',
      });
    });

    it('should translate DuplicateEntityException to HTTP 409 with DUPLICATE_ENTITY', () => {
      const { host, statusMock, jsonMock } = createMockHost();
      const exception = new DuplicateEntityException('Duplicate SKU');

      filter.catch(exception, host);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(jsonMock).toHaveBeenCalledWith({
        detail: 'Duplicate SKU',
        error_code: 'DUPLICATE_ENTITY',
      });
    });

    it('should translate InsufficientStockException to HTTP 409 with INSUFFICIENT_STOCK', () => {
      const { host, statusMock, jsonMock } = createMockHost();
      const exception = new InsufficientStockException('Out of stock');

      filter.catch(exception, host);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(jsonMock).toHaveBeenCalledWith({
        detail: 'Out of stock',
        error_code: 'INSUFFICIENT_STOCK',
      });
    });

    it('should translate InvalidValueException to HTTP 422 with the offending field', () => {
      const { host, statusMock, jsonMock } = createMockHost();
      const exception = new InvalidValueException('sku is invalid', 'sku');

      filter.catch(exception, host);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(jsonMock).toHaveBeenCalledWith({
        detail: 'sku is invalid',
        error_code: 'VALIDATION_ERROR',
        errors: [{ field: 'sku', message: 'sku is invalid' }],
      });
    });

    it('should translate InvalidValueException without a field to HTTP 422 and no errors list', () => {
      const { host, statusMock, jsonMock } = createMockHost();

      filter.catch(new InvalidValueException('bad value'), host);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(jsonMock).toHaveBeenCalledWith({
        detail: 'bad value',
        error_code: 'VALIDATION_ERROR',
      });
    });

    it('should translate InvalidOperationException to HTTP 400 with INVALID_OPERATION', () => {
      const { host, statusMock, jsonMock } = createMockHost();
      const exception = new InvalidOperationException('Invalid order state');

      filter.catch(exception, host);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(jsonMock).toHaveBeenCalledWith({
        detail: 'Invalid order state',
        error_code: 'INVALID_OPERATION',
      });
    });
  });

  describe('HttpExceptionFilter', () => {
    let filter: HttpExceptionFilter;

    beforeEach(() => {
      filter = new HttpExceptionFilter();
    });

    it('should normalize standard NotFoundException into ErrorResponse', () => {
      const { host, statusMock, jsonMock } = createMockHost();
      const exception = new NotFoundException('Resource missing');

      filter.catch(exception, host);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(jsonMock).toHaveBeenCalledWith({
        detail: 'Resource missing',
        error_code: 'ENTITY_NOT_FOUND',
      });
    });

    it('should normalize ForbiddenException into ErrorResponse with FORBIDDEN', () => {
      const { host, statusMock, jsonMock } = createMockHost();
      const exception = new ForbiddenException();

      filter.catch(exception, host);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      expect(jsonMock).toHaveBeenCalledWith({
        detail: 'Forbidden',
        error_code: 'FORBIDDEN',
      });
    });

    it('should preserve errors array and detail from UnprocessableEntityException (422 validation)', () => {
      const { host, statusMock, jsonMock } = createMockHost();
      const validationPayload = {
        detail: 'Request validation failed',
        error_code: 'VALIDATION_ERROR',
        errors: [{ field: 'email', message: 'invalid email' }],
      };
      const exception = new UnprocessableEntityException(validationPayload);

      filter.catch(exception, host);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(jsonMock).toHaveBeenCalledWith({
        detail: 'Request validation failed',
        error_code: 'VALIDATION_ERROR',
        errors: [{ field: 'email', message: 'invalid email' }],
      });
    });
  });

  describe('AllExceptionsFilter', () => {
    let filter: AllExceptionsFilter;

    beforeEach(() => {
      filter = new AllExceptionsFilter();
    });

    it('should catch generic Error, mask message, and return 500 INTERNAL_SERVER_ERROR', () => {
      const { host, statusMock, jsonMock } = createMockHost();
      const exception = new Error('Sensitive DB password connection timeout');

      filter.catch(exception, host);

      expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(jsonMock).toHaveBeenCalledWith({
        detail: 'Internal server error',
        error_code: 'INTERNAL_SERVER_ERROR',
      });
      // Ensure the sensitive message is NOT in the client payload
      const firstCallArg = (jsonMock.mock.calls as unknown[][])[0]?.[0];
      expect(JSON.stringify(firstCallArg)).not.toContain(
        'Sensitive DB password',
      );
    });
  });
});
