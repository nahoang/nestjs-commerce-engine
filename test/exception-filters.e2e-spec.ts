import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Server } from 'http';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/shared/infrastructure/prisma/prisma.service';
import { ErrorResponse } from '../src/shared/api/envelope';
import { ExceptionTestController } from './fixtures/exception-test.controller';

describe('Global Exception Filters (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [ExceptionTestController],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn().mockResolvedValue(undefined),
        $disconnect: jest.fn().mockResolvedValue(undefined),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /test-exceptions/entity-not-found throws EntityNotFoundException -> 404 ENTITY_NOT_FOUND', async () => {
    const response = await request(app.getHttpServer() as Server)
      .get('/test-exceptions/entity-not-found')
      .expect(404);

    const body = response.body as unknown as ErrorResponse;
    expect(body).toEqual({
      detail: "Product with id 'prod-123' not found",
      error_code: 'ENTITY_NOT_FOUND',
    });
  });

  it('GET /test-exceptions/insufficient-stock throws InsufficientStockException -> 409 INSUFFICIENT_STOCK', async () => {
    const response = await request(app.getHttpServer() as Server)
      .get('/test-exceptions/insufficient-stock')
      .expect(409);

    const body = response.body as unknown as ErrorResponse;
    expect(body).toEqual({
      detail: 'Requested 10 units but only 3 available',
      error_code: 'INSUFFICIENT_STOCK',
    });
  });

  it('GET /test-exceptions/duplicate-entity throws DuplicateEntityException -> 409 DUPLICATE_ENTITY', async () => {
    const response = await request(app.getHttpServer() as Server)
      .get('/test-exceptions/duplicate-entity')
      .expect(409);

    const body = response.body as unknown as ErrorResponse;
    expect(body).toEqual({
      detail: 'Product with slug "awesome-shirt" already exists',
      error_code: 'DUPLICATE_ENTITY',
    });
  });

  it('GET /test-exceptions/invalid-operation throws InvalidOperationException -> 400 INVALID_OPERATION', async () => {
    const response = await request(app.getHttpServer() as Server)
      .get('/test-exceptions/invalid-operation')
      .expect(400);

    const body = response.body as unknown as ErrorResponse;
    expect(body).toEqual({
      detail: 'Cannot cancel already shipped order',
      error_code: 'INVALID_OPERATION',
    });
  });

  it('GET /test-exceptions/http-forbidden throws ForbiddenException -> 403 FORBIDDEN', async () => {
    const response = await request(app.getHttpServer() as Server)
      .get('/test-exceptions/http-forbidden')
      .expect(403);

    const body = response.body as unknown as ErrorResponse;
    expect(body).toEqual({
      detail: 'Admin role required',
      error_code: 'FORBIDDEN',
    });
  });

  it('GET /test-exceptions/unhandled-error throws generic Error -> 500 INTERNAL_SERVER_ERROR without exposing internal message', async () => {
    const response = await request(app.getHttpServer() as Server)
      .get('/test-exceptions/unhandled-error')
      .expect(500);

    const body = response.body as unknown as ErrorResponse;
    expect(body).toEqual({
      detail: 'Internal server error',
      error_code: 'INTERNAL_SERVER_ERROR',
    });

    // Verify sensitive data is NOT leaked in the response
    expect(JSON.stringify(response.body)).not.toContain('Database password');
    expect(JSON.stringify(response.body)).not.toContain('db.internal:5432');
  });
});
