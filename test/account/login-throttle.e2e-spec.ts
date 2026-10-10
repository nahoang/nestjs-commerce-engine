import { INestApplication } from '@nestjs/common';
import { Server } from 'http';
import * as request from 'supertest';
import { truncateAll } from '../helpers/db';
import { PrismaService } from '../../src/shared/infrastructure/prisma/prisma.service';
import { ErrorResponse } from '../../src/shared/api/envelope';

describe('Login throttling (e2e) — DOMAIN-SPEC-2-AUTH § 2.3 R6', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    // ConfigModule.forRoot validates process.env when AppModule is first imported,
    // so the limit must be set BEFORE that import happens
    process.env.LOGIN_RATE_LIMIT = '5';
    process.env.LOGIN_RATE_WINDOW_SECONDS = '60';
    const { createTestApp } = await import('../helpers/test-app');
    const context = await createTestApp();
    app = context.app;
    prisma = context.prisma;
  });

  afterAll(async () => {
    await truncateAll(prisma);
    await app.close();
    process.env.LOGIN_RATE_LIMIT = '1000';
    delete process.env.LOGIN_RATE_WINDOW_SECONDS;
  });

  const server = (): Server => app.getHttpServer() as Server;
  const attempt = (): request.Test =>
    request(server())
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@example.com', password: 'wrong-password' });

  it('6. the 6th login within the window from one IP -> 429 RATE_LIMITED with Retry-After', async () => {
    for (let i = 0; i < 5; i++) {
      await attempt().expect(401);
    }

    const res = await attempt().expect(429);

    expect((res.body as ErrorResponse).error_code).toBe('RATE_LIMITED');
    const retryAfter = Number(res.headers['retry-after']);
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(60);
  });

  it('6b. only login is throttled: /me and register keep answering', async () => {
    for (let i = 0; i < 8; i++) {
      await request(server()).get('/api/v1/auth/me').expect(401);
    }
    await request(server())
      .post('/api/v1/auth/register')
      .send({
        email: 'free@example.com',
        password: 'correct-horse-battery',
        first_name: 'Free',
        last_name: 'Rate',
      })
      .expect(201);
  });
});
