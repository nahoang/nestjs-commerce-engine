import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Server } from 'http';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/shared/infrastructure/prisma/prisma.service';

describe('CORS, Request ID & Logging (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn().mockResolvedValue(undefined),
        $disconnect: jest.fn().mockResolvedValue(undefined),
        $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health without X-Request-ID header should return newly generated non-empty X-Request-ID header', async () => {
    const response = await request(app.getHttpServer() as Server)
      .get('/health')
      .expect(200);

    const requestId = response.headers['x-request-id'];
    expect(requestId).toBeDefined();
    expect(typeof requestId).toBe('string');
    expect(requestId.length).toBeGreaterThan(0);
    // UUID v4 format regex
    expect(requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it('GET /health with X-Request-ID: abc123 should echo back abc123 in response header', async () => {
    const customId = 'abc123';
    const response = await request(app.getHttpServer() as Server)
      .get('/health')
      .set('X-Request-ID', customId)
      .expect(200);

    expect(response.headers['x-request-id']).toBe(customId);
  });

  it('CORS: request with Origin header should receive Access-Control-Allow-Origin', async () => {
    const response = await request(app.getHttpServer() as Server)
      .get('/health')
      .set('Origin', 'http://localhost:3000')
      .expect(200);

    expect(response.headers['access-control-allow-origin']).toBeDefined();
  });
});
