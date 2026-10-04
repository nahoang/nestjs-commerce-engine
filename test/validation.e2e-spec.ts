import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Server } from 'http';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/shared/infrastructure/prisma/prisma.service';
import {
  ErrorResponse,
  ApiResponse,
  PaginatedResponse,
} from '../src/shared/api/envelope';
import {
  ValidationTestController,
  CreateProductTestDto,
} from './fixtures/validation-test.controller';

describe('Global ValidationPipe (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [ValidationTestController],
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

  it('POST /test-fixtures/products with empty body should return 422 with VALIDATION_ERROR and field errors', async () => {
    const response = await request(app.getHttpServer() as Server)
      .post('/test-fixtures/products')
      .send({})
      .expect(422);

    const body = response.body as unknown as ErrorResponse;
    expect(body.detail).toBe('Request validation failed');
    expect(body.error_code).toBe('VALIDATION_ERROR');
    expect(body.errors?.some((err) => err.field === 'name')).toBe(true);
  });

  it('POST /test-fixtures/products with invalid nested variant should return 422 with dotted field name (variants.0.sku)', async () => {
    const response = await request(app.getHttpServer() as Server)
      .post('/test-fixtures/products')
      .send({
        name: 'Valid Product',
        variants: [{ price: 99.99 }], // missing sku
      })
      .expect(422);

    const body = response.body as unknown as ErrorResponse;
    expect(body.detail).toBe('Request validation failed');
    expect(body.error_code).toBe('VALIDATION_ERROR');
    expect(
      body.errors?.some(
        (err) =>
          err.field === 'variants.0.sku' &&
          err.message === 'sku should not be empty',
      ),
    ).toBe(true);
  });

  it('GET /test-fixtures/products?limit=0 should return 422 with field limit', async () => {
    const response = await request(app.getHttpServer() as Server)
      .get('/test-fixtures/products?limit=0')
      .expect(422);

    const body = response.body as unknown as ErrorResponse;
    expect(body.detail).toBe('Request validation failed');
    expect(body.error_code).toBe('VALIDATION_ERROR');
    expect(
      body.errors?.some(
        (err) =>
          err.field === 'limit' &&
          err.message.includes('limit must not be less than 1'),
      ),
    ).toBe(true);
  });

  it('POST /test-fixtures/products with valid payload should return 200 with standard ApiResponse envelope', async () => {
    const validPayload = {
      name: 'Mechanical Keyboard',
      variants: [{ sku: 'KB-001', price: 1500000 }],
    };

    const response = await request(app.getHttpServer() as Server)
      .post('/test-fixtures/products')
      .send(validPayload)
      .expect(200);

    const body = response.body as unknown as ApiResponse<CreateProductTestDto>;
    expect(body).toEqual({
      data: validPayload,
      message: 'success',
    });
  });

  it('GET /test-fixtures/products with valid query should return 200 with standard PaginatedResponse envelope', async () => {
    const response = await request(app.getHttpServer() as Server)
      .get('/test-fixtures/products?limit=20&offset=0')
      .expect(200);

    const body = response.body as unknown as PaginatedResponse<{
      id: string;
      name: string;
    }>;
    expect(body).toEqual({
      data: [{ id: 'p1', name: 'Product 1' }],
      total: 10,
      page: 1,
      page_size: 20,
      has_next: false,
    });
  });
});
