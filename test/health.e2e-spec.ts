import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Server } from 'http';
import { createTestApp } from './helpers/test-app';
import { truncateAll } from './helpers/db';
import { PrismaService } from '../src/shared/infrastructure/prisma/prisma.service';

describe('HealthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const testContext = await createTestApp();
    app = testContext.app;
    prisma = testContext.prisma;
  });

  afterEach(async () => {
    await truncateAll(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns 200 with healthy status', async () => {
    const response = await request(app.getHttpServer() as Server)
      .get('/health')
      .expect(200);

    const body = response.body as { status: string; version: string };
    expect(body.status).toBe('healthy');
    expect(typeof body.version).toBe('string');
  });
});
