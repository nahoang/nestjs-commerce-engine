import { INestApplication } from '@nestjs/common';
import { Server } from 'http';
import * as request from 'supertest';
import { createTestApp } from '../helpers/test-app';
import { truncateAll } from '../helpers/db';
import { PrismaService } from '../../src/shared/infrastructure/prisma/prisma.service';
import { ApiResponse, ErrorResponse } from '../../src/shared/api/envelope';
import { UserResponse } from '../../src/modules/account/api/user.response';
import { PasswordHasher } from '../../src/modules/account/application/password-hasher';

describe('AuthController register (e2e) — DOMAIN-SPEC-2-AUTH § 2.2', () => {
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

  const valid = {
    email: 'Lan@Example.com',
    password: 'correct-horse-battery',
    first_name: 'Lan',
    last_name: 'Nguyen',
  };

  const register = (body: Record<string, unknown>): request.Test =>
    request(server()).post('/api/v1/auth/register').send(body);

  it('1. registers a customer and leaks no secret field', async () => {
    const res = await register(valid).expect(201);

    const data = (res.body as ApiResponse<UserResponse>).data;
    expect(data).toMatchObject({
      email: 'lan@example.com',
      first_name: 'Lan',
      last_name: 'Nguyen',
      role: 'customer',
      is_active: true,
    });
    expect(Object.keys(data).sort()).toEqual([
      'created_at',
      'email',
      'first_name',
      'id',
      'is_active',
      'last_name',
      'role',
      'updated_at',
    ]);
    expect(JSON.stringify(res.body)).not.toContain(valid.password);
  });

  it('2. ignores "role": "admin" in the payload', async () => {
    const res = await register({ ...valid, role: 'admin' }).expect(201);

    expect((res.body as ApiResponse<UserResponse>).data.role).toBe('customer');
    const row = await prisma.user.findFirstOrThrow();
    expect(row.role).toBe('customer');
  });

  it('3a. duplicate email (any case) -> 409 DUPLICATE_ENTITY', async () => {
    await register(valid).expect(201);

    const res = await register({ ...valid, email: 'LAN@example.COM' }).expect(
      409,
    );
    expect((res.body as ErrorResponse).error_code).toBe('DUPLICATE_ENTITY');
    expect(await prisma.user.count()).toBe(1);
  });

  it('3b. a 7-character password -> 422 on password and nothing is stored', async () => {
    const res = await register({ ...valid, password: '1234567' }).expect(422);

    expect((res.body as ErrorResponse).errors?.map((e) => e.field)).toContain(
      'password',
    );
    expect(await prisma.user.count()).toBe(0);
  });

  it.each([
    [{ email: 'not-an-email' }, 'email'],
    [{ email: undefined }, 'email'],
    [{ password: 'x'.repeat(129) }, 'password'],
    [{ first_name: '   ' }, 'first_name'],
    [{ last_name: undefined }, 'last_name'],
  ])('3c. invalid payload %j -> 422 on %s', async (override, field) => {
    const res = await register({ ...valid, ...override }).expect(422);

    expect((res.body as ErrorResponse).errors?.map((e) => e.field)).toContain(
      field,
    );
    expect(await prisma.user.count()).toBe(0);
  });

  it('4. stores a hash that differs from the password and verifies with the hasher', async () => {
    await register(valid).expect(201);

    const row = await prisma.user.findFirstOrThrow();
    expect(row.passwordHash).not.toBe(valid.password);
    expect(row.passwordHash.startsWith('$argon2id$')).toBe(true);
    const hasher = app.get(PasswordHasher);
    await expect(hasher.verify(valid.password, row.passwordHash)).resolves.toBe(
      true,
    );
    await expect(
      hasher.verify('wrong-password', row.passwordHash),
    ).resolves.toBe(false);
    expect(row.tokenKey).toMatch(/^[0-9a-f]{64}$/);
  });
});
