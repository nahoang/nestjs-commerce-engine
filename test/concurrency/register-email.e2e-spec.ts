import { INestApplication } from '@nestjs/common';
import { Server } from 'http';
import * as request from 'supertest';
import { createTestApp } from '../helpers/test-app';
import { truncateAll } from '../helpers/db';
import { runConcurrently } from '../helpers/concurrency';
import { PrismaService } from '../../src/shared/infrastructure/prisma/prisma.service';

describe('Email uniqueness under concurrency (e2e) — DOMAIN-SPEC-2-AUTH § 2.2 R2', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const context = await createTestApp();
    app = context.app;
    prisma = context.prisma;
  });

  afterAll(async () => {
    await truncateAll(prisma);
    await app.close();
  });

  beforeEach(async () => {
    await truncateAll(prisma);
  });

  const server = (): Server => app.getHttpServer() as Server;

  it('exactly one of N simultaneous registrations wins an email; the others get 409', async () => {
    const statuses = await runConcurrently(4, async (i) => {
      const res = await request(server())
        .post('/api/v1/auth/register')
        .send({
          // Differ only by case: they must still collide after normalization
          email: i % 2 === 0 ? 'Race@Example.com' : 'race@EXAMPLE.com',
          password: 'correct-horse-battery',
          first_name: 'Race',
          last_name: 'Condition',
        });
      return res.status;
    });

    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(3);
    expect(await prisma.user.count()).toBe(1);
  });
});
