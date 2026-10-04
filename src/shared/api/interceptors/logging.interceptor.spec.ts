import {
  ExecutionContext,
  CallHandler,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';
import { ClsService } from 'nestjs-cls';
import { EntityNotFoundException } from '../../domain/exceptions';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let mockClsService: Partial<ClsService>;
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockClsService = {
      getId: jest.fn().mockReturnValue('test-trace-id-123'),
    };
    interceptor = new LoggingInterceptor(mockClsService as ClsService);
    const logger = (interceptor as unknown as { logger: Logger }).logger;
    logSpy = jest.spyOn(logger, 'log').mockImplementation();
    errorSpy = jest.spyOn(logger, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function createMockContext(
    method = 'GET',
    url = '/api/v1/test',
    statusCode = 200,
  ): ExecutionContext {
    const req = {
      method,
      originalUrl: url,
      url,
      headers: {},
    };
    const res = {
      statusCode,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
    } as unknown as ExecutionContext;
  }

  it('should log successful request with method, path, status, duration and requestId', (done) => {
    const context = createMockContext('GET', '/api/v1/products', 200);
    const handler: CallHandler = {
      handle: () => of({ success: true }),
    };

    interceptor.intercept(context, handler).subscribe({
      next: (val) => {
        expect(val).toEqual({ success: true });
      },
      complete: () => {
        expect(logSpy).toHaveBeenCalledTimes(1);
        const calls = logSpy.mock.calls as unknown[][];
        const logMsg = calls[0]?.[0] as string;
        expect(logMsg).toContain('GET /api/v1/products → 200 in ');
        expect(logMsg).toContain('[test-trace-id-123]');
        done();
      },
    });
  });

  it('should log error with resolved status when handler throws HttpException', (done) => {
    const context = createMockContext('GET', '/api/v1/missing', 200);
    const notFound = new NotFoundException('Not found');
    const handler: CallHandler = {
      handle: () => throwError(() => notFound),
    };

    interceptor.intercept(context, handler).subscribe({
      error: (err) => {
        expect(err).toBe(notFound);
        expect(errorSpy).toHaveBeenCalledTimes(1);
        const calls = errorSpy.mock.calls as unknown[][];
        const logMsg = calls[0]?.[0] as string;
        expect(logMsg).toContain('GET /api/v1/missing → 404 in ');
        expect(logMsg).toContain('[test-trace-id-123]');
        done();
      },
    });
  });

  it('should log error with resolved status when handler throws DomainException', (done) => {
    const context = createMockContext('GET', '/api/v1/products/404', 200);
    const domainEx = new EntityNotFoundException('Product', '404');
    const handler: CallHandler = {
      handle: () => throwError(() => domainEx),
    };

    interceptor.intercept(context, handler).subscribe({
      error: (err) => {
        expect(err).toBe(domainEx);
        expect(errorSpy).toHaveBeenCalledTimes(1);
        const calls = errorSpy.mock.calls as unknown[][];
        const logMsg = calls[0]?.[0] as string;
        expect(logMsg).toContain('GET /api/v1/products/404 → 404 in ');
        expect(logMsg).toContain('[test-trace-id-123]');
        done();
      },
    });
  });

  it('should fallback to header or no-request-id when ClsService is not provided', (done) => {
    const interceptorNoCls = new LoggingInterceptor();
    const loggerNoCls = (interceptorNoCls as unknown as { logger: Logger })
      .logger;
    const logSpyNoCls = jest.spyOn(loggerNoCls, 'log').mockImplementation();

    const context = createMockContext('POST', '/api/v1/checkout', 201);
    const handler: CallHandler = {
      handle: () => of({ ok: true }),
    };

    interceptorNoCls.intercept(context, handler).subscribe({
      complete: () => {
        expect(logSpyNoCls).toHaveBeenCalledTimes(1);
        const calls = logSpyNoCls.mock.calls as unknown[][];
        const logMsg = calls[0]?.[0] as string;
        expect(logMsg).toContain('POST /api/v1/checkout → 201 in ');
        expect(logMsg).toContain('[no-request-id]');
        done();
      },
    });
  });
});
