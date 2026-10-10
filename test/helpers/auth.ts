import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import { PrismaService } from '../../src/shared/infrastructure/prisma/prisma.service';
import { truncateAll } from './db';

// A fixed identity lets a test sign a valid token synchronously, with no hashing
const TEST_ADMIN_ID = '00000000-0000-4000-8000-000000000001';
const TEST_ADMIN_TOKEN_KEY = 'a'.repeat(64);

export type TestRole = 'customer' | 'staff' | 'admin';

/** Inserts the fixed test admin. Call after every truncateAll of a test that acts as admin. */
export async function seedTestAdmin(prisma: PrismaService): Promise<void> {
  await prisma.user.create({
    data: {
      id: TEST_ADMIN_ID,
      email: 'test-admin@example.com',
      passwordHash: 'not-a-real-hash',
      firstName: 'Test',
      lastName: 'Admin',
      role: 'admin',
      tokenKey: TEST_ADMIN_TOKEN_KEY,
    },
  });
}

/** Truncates every table, then re-creates the test admin. */
export async function resetWithAdmin(prisma: PrismaService): Promise<void> {
  await truncateAll(prisma);
  await seedTestAdmin(prisma);
}

/** supertest agent that sends the test admin's bearer token on every request. */
export function adminApi(
  app: INestApplication,
): ReturnType<typeof request.agent> {
  const token = app
    .get(JwtService)
    .sign({ sub: TEST_ADMIN_ID, tkey: TEST_ADMIN_TOKEN_KEY });
  return request
    .agent(app.getHttpServer() as never)
    .set('Authorization', `Bearer ${token}`);
}

/** Creates a user with the given role and returns a valid token for it. */
export async function createUserToken(
  app: INestApplication,
  prisma: PrismaService,
  role: TestRole,
  email: string,
): Promise<string> {
  const tokenKey = 'b'.repeat(64);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: 'not-a-real-hash',
      firstName: role,
      lastName: 'Tester',
      role,
      tokenKey,
    },
  });
  return app.get(JwtService).sign({ sub: user.id, tkey: tokenKey });
}
