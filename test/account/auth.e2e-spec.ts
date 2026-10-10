import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server } from 'http';
import * as request from 'supertest';
import { createTestApp } from '../helpers/test-app';
import { truncateAll } from '../helpers/db';
import { PrismaService } from '../../src/shared/infrastructure/prisma/prisma.service';
import { ApiResponse, ErrorResponse } from '../../src/shared/api/envelope';
import { TokenResponse } from '../../src/modules/account/api/token.response';
import { UserResponse } from '../../src/modules/account/api/user.response';

describe('Auth login, me, change-password (e2e) — DOMAIN-SPEC-2-AUTH § 2.3', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;

  beforeAll(async () => {
    const context = await createTestApp();
    app = context.app;
    prisma = context.prisma;
    jwt = app.get(JwtService);
  });

  afterAll(async () => {
    await truncateAll(prisma);
    await app.close();
  });

  beforeEach(async () => {
    await truncateAll(prisma);
  });

  const server = (): Server => app.getHttpServer() as Server;
  const EMAIL = 'lan@example.com';
  const PASSWORD = 'correct-horse-battery';

  const register = async (): Promise<UserResponse> => {
    const res = await request(server())
      .post('/api/v1/auth/register')
      .send({
        email: EMAIL,
        password: PASSWORD,
        first_name: 'Lan',
        last_name: 'Nguyen',
      })
      .expect(201);
    return (res.body as ApiResponse<UserResponse>).data;
  };

  const login = (email: string, password: string): request.Test =>
    request(server()).post('/api/v1/auth/login').send({ email, password });

  const loginToken = async (): Promise<string> => {
    const res = await login(EMAIL, PASSWORD).expect(200);
    return (res.body as ApiResponse<TokenResponse>).data.access_token;
  };

  const me = (token?: string): request.Test => {
    const req = request(server()).get('/api/v1/auth/me');
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  };

  const changePassword = (
    token: string,
    current: string,
    next: string,
  ): request.Test =>
    request(server())
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ current_password: current, new_password: next });

  const errorCode = (res: request.Response): string | undefined =>
    (res.body as ErrorResponse).error_code;

  it('1. logs in and /me returns the same user', async () => {
    const user = await register();

    const res = await login('LAN@Example.com', PASSWORD).expect(200);
    const token = (res.body as ApiResponse<TokenResponse>).data;
    expect(token.token_type).toBe('bearer');
    expect(token.expires_in).toBe(30 * 60);

    const profile = await me(token.access_token).expect(200);
    expect((profile.body as ApiResponse<UserResponse>).data).toEqual(user);
  });

  it('2. wrong password and unknown email give the identical 401', async () => {
    await register();

    const wrongPassword = await login(EMAIL, 'wrong-password').expect(401);
    const unknownEmail = await login('nobody@example.com', PASSWORD).expect(
      401,
    );

    expect(wrongPassword.body).toEqual(unknownEmail.body);
    expect(errorCode(wrongPassword)).toBe('UNAUTHENTICATED');
    expect(wrongPassword.headers['www-authenticate']).toBe('Bearer');
  });

  it('2b. a deactivated user cannot log in, and an old token stops working (R2, R4)', async () => {
    await register();
    const token = await loginToken();
    await prisma.user.updateMany({ data: { isActive: false } });

    const attempt = await login(EMAIL, PASSWORD).expect(401);
    expect(errorCode(attempt)).toBe('UNAUTHENTICATED');
    await me(token).expect(401);
  });

  it('3. /me without a token, with garbage, or with a non-Bearer scheme -> 401', async () => {
    await register();

    for (const header of [
      undefined,
      'Bearer',
      'Bearer not.a.jwt',
      'Basic abc',
    ]) {
      const req = request(server()).get('/api/v1/auth/me');
      const res = await (header ? req.set('Authorization', header) : req);
      expect(res.status).toBe(401);
      expect(errorCode(res)).toBe('UNAUTHENTICATED');
    }
  });

  it('3b. a token signed with another secret, or unsigned (alg none), -> 401', async () => {
    const user = await register();
    const row = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    const forged = await new JwtService({
      secret: 'some-other-secret',
    }).signAsync({ sub: user.id, tkey: row.tokenKey }, { expiresIn: 600 });
    const header = Buffer.from('{"alg":"none","typ":"JWT"}').toString(
      'base64url',
    );
    const body = Buffer.from(
      JSON.stringify({ sub: user.id, tkey: row.tokenKey }),
    ).toString('base64url');

    await me(forged).expect(401);
    await me(`${header}.${body}.`).expect(401);
  });

  it('4. change password revokes old tokens, returns a new one, and the old password stops working', async () => {
    await register();
    const oldToken = await loginToken();
    const before = await prisma.user.findFirstOrThrow();

    const res = await changePassword(
      oldToken,
      PASSWORD,
      'a-brand-new-passphrase',
    ).expect(200);
    const newToken = (res.body as ApiResponse<TokenResponse>).data;

    await me(oldToken).expect(401);
    await me(newToken.access_token).expect(200);
    await login(EMAIL, PASSWORD).expect(401);
    await login(EMAIL, 'a-brand-new-passphrase').expect(200);

    const after = await prisma.user.findFirstOrThrow();
    expect(after.tokenKey).not.toBe(before.tokenKey);
    expect(after.passwordHash).not.toBe(before.passwordHash);
  });

  it('4b. wrong current password -> 401 and nothing changes; short new password -> 422', async () => {
    await register();
    const token = await loginToken();
    const before = await prisma.user.findFirstOrThrow();

    await changePassword(
      token,
      'wrong-current',
      'a-brand-new-passphrase',
    ).expect(401);
    const short = await changePassword(token, PASSWORD, '1234567').expect(422);
    expect((short.body as ErrorResponse).errors?.map((e) => e.field)).toContain(
      'new_password',
    );
    await request(server())
      .post('/api/v1/auth/change-password')
      .send({
        current_password: PASSWORD,
        new_password: 'a-brand-new-passphrase',
      })
      .expect(401);

    const after = await prisma.user.findFirstOrThrow();
    expect(after.passwordHash).toBe(before.passwordHash);
    expect(after.tokenKey).toBe(before.tokenKey);
    await me(token).expect(200);
  });

  it('5. an expired token -> 401', async () => {
    const user = await register();
    const row = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    const expired = await jwt.signAsync({
      sub: user.id,
      tkey: row.tokenKey,
      exp: Math.floor(Date.now() / 1000) - 10,
    });

    const res = await me(expired).expect(401);
    expect(errorCode(res)).toBe('UNAUTHENTICATED');
  });

  it.each([
    [{ email: 'not-an-email', password: 'x' }, 'email'],
    [{ password: 'x' }, 'email'],
    [{ email: 'lan@example.com' }, 'password'],
  ])('login payload %j -> 422 on %s', async (body, field) => {
    const res = await request(server())
      .post('/api/v1/auth/login')
      .send(body)
      .expect(422);
    expect((res.body as ErrorResponse).errors?.map((e) => e.field)).toContain(
      field,
    );
  });
});
