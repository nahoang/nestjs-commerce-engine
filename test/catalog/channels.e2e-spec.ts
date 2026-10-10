import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from '../helpers/test-app';
import { truncateAll } from '../helpers/db';
import { adminApi, resetWithAdmin } from '../helpers/auth';
import { PrismaService } from '../../src/shared/infrastructure/prisma/prisma.service';
import {
  ApiResponse,
  ErrorResponse,
  PaginatedResponse,
} from '../../src/shared/api/envelope';
import { ChannelResponse } from '../../src/modules/catalog/api/channel.response';

describe('ChannelsController (e2e) — DOMAIN-SPEC-1-CATALOG § 1.7', () => {
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
    await resetWithAdmin(prisma);
  });

  const create = (body: Record<string, unknown>): request.Test =>
    adminApi(app).post('/api/v1/channels').send(body);

  it('1. creates vn-store (VND) and us-store (USD); the list has both', async () => {
    const vn = await create({
      name: 'VN Store',
      slug: 'vn-store',
      currency: 'VND',
    }).expect(201);
    const vnBody = (vn.body as ApiResponse<ChannelResponse>).data;
    expect(vnBody).toMatchObject({
      name: 'VN Store',
      slug: 'vn-store',
      currency: 'VND',
      is_active: true,
    });

    await create({
      name: 'US Store',
      slug: 'us-store',
      currency: 'usd',
    }).expect(201);

    const res = await adminApi(app).get('/api/v1/channels').expect(200);
    const page = res.body as PaginatedResponse<ChannelResponse>;
    expect(page.total).toBe(2);
    expect(page.data.map((c) => c.slug)).toEqual(['vn-store', 'us-store']);
    expect(page.data[1].currency).toBe('USD');
  });

  it('1b. R1: slug is generated from the name when omitted', async () => {
    const res = await create({ name: 'Cửa Hàng Việt', currency: 'VND' }).expect(
      201,
    );
    expect((res.body as ApiResponse<ChannelResponse>).data.slug).toBe(
      'cua-hang-viet',
    );
  });

  it('1c. GET /:slug returns the channel, unknown slug -> 404', async () => {
    await create({
      name: 'VN Store',
      slug: 'vn-store',
      currency: 'VND',
    }).expect(201);
    const found = await adminApi(app)
      .get('/api/v1/channels/vn-store')
      .expect(200);
    expect((found.body as ApiResponse<ChannelResponse>).data.currency).toBe(
      'VND',
    );

    const missing = await adminApi(app)
      .get('/api/v1/channels/nope')
      .expect(404);
    expect((missing.body as ErrorResponse).error_code).toBe('ENTITY_NOT_FOUND');
  });

  it('2. R1: duplicate slug -> 409', async () => {
    await create({
      name: 'VN Store',
      slug: 'vn-store',
      currency: 'VND',
    }).expect(201);
    const res = await create({
      name: 'Other',
      slug: 'vn-store',
      currency: 'USD',
    }).expect(409);
    expect((res.body as ErrorResponse).error_code).toBe('DUPLICATE_ENTITY');
    expect(await prisma.channel.count()).toBe(1);
  });

  it('3. R2/R3: PATCH is_active=false switches it off; currency stays even if sent', async () => {
    await create({
      name: 'VN Store',
      slug: 'vn-store',
      currency: 'VND',
    }).expect(201);

    const res = await adminApi(app)
      .patch('/api/v1/channels/vn-store')
      .send({ is_active: false, currency: 'USD', slug: 'hacked' })
      .expect(200);
    const data = (res.body as ApiResponse<ChannelResponse>).data;
    expect(data.is_active).toBe(false);
    expect(data.currency).toBe('VND');
    expect(data.slug).toBe('vn-store');

    const row = await prisma.channel.findUniqueOrThrow({
      where: { slug: 'vn-store' },
    });
    expect(row.currency).toBe('VND');
    expect(row.isActive).toBe(false);
  });

  it('3b. PATCH renames and can switch the channel back on', async () => {
    await create({
      name: 'VN Store',
      slug: 'vn-store',
      currency: 'VND',
      is_active: false,
    }).expect(201);
    const res = await adminApi(app)
      .patch('/api/v1/channels/vn-store')
      .send({ name: '  Vietnam Store ', is_active: true })
      .expect(200);
    expect((res.body as ApiResponse<ChannelResponse>).data).toMatchObject({
      name: 'Vietnam Store',
      is_active: true,
    });
  });

  it('3c. PATCH unknown slug -> 404; empty name -> 422', async () => {
    await adminApi(app)
      .patch('/api/v1/channels/nope')
      .send({ is_active: false })
      .expect(404);
    await create({
      name: 'VN Store',
      slug: 'vn-store',
      currency: 'VND',
    }).expect(201);
    const res = await adminApi(app)
      .patch('/api/v1/channels/vn-store')
      .send({ name: '  ' })
      .expect(422);
    expect((res.body as ErrorResponse).errors?.map((e) => e.field)).toContain(
      'name',
    );
  });

  it.each([
    [{ name: 'X', currency: 'dong' }, 'currency'],
    [{ name: 'X' }, 'currency'],
    [{ currency: 'VND' }, 'name'],
    [{ name: 'X', currency: 'VND', slug: 'Bad Slug' }, 'slug'],
    [{ name: 'X', currency: 'VND', is_active: 'yes' }, 'is_active'],
  ])(
    '4. invalid payload %j -> 422 on %s and nothing is stored',
    async (body, field) => {
      const res = await create(body).expect(422);
      expect((res.body as ErrorResponse).errors?.map((e) => e.field)).toContain(
        field,
      );
      expect(await prisma.channel.count()).toBe(0);
    },
  );
});
