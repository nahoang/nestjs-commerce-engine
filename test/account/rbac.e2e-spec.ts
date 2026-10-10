import { INestApplication } from '@nestjs/common';
import { Server } from 'http';
import * as request from 'supertest';
import { createTestApp } from '../helpers/test-app';
import { truncateAll } from '../helpers/db';
import { adminApi, createUserToken, resetWithAdmin } from '../helpers/auth';
import { PrismaService } from '../../src/shared/infrastructure/prisma/prisma.service';
import {
  ApiResponse,
  ErrorResponse,
  PaginatedResponse,
} from '../../src/shared/api/envelope';
import { CategoryResponse } from '../../src/modules/catalog/api/category.response';
import { ProductResponse } from '../../src/modules/catalog/api/product.response';

describe('RBAC and catalog protection (e2e) — DOMAIN-SPEC-2-AUTH § 2.4', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let customerToken: string;
  let staffToken: string;

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
    customerToken = await createUserToken(
      app,
      prisma,
      'customer',
      'customer@example.com',
    );
    staffToken = await createUserToken(
      app,
      prisma,
      'staff',
      'staff@example.com',
    );
  });

  const server = (): Server => app.getHttpServer() as Server;
  const bearer = (token: string): [string, string] => [
    'Authorization',
    `Bearer ${token}`,
  ];
  const errorCode = (res: request.Response): string | undefined =>
    (res.body as ErrorResponse).error_code;

  async function createProduct(
    name: string,
    publish: boolean,
  ): Promise<ProductResponse> {
    const res = await adminApi(app)
      .post('/api/v1/products')
      .send({
        name,
        is_published: publish,
        variants: [
          { sku: `SKU-${name}`, name, price_amount: '100000', currency: 'VND' },
        ],
      })
      .expect(201);
    return (res.body as ApiResponse<ProductResponse>).data;
  }

  it('1. customer creates a category -> 403 FORBIDDEN; no token -> 401; admin -> 201', async () => {
    const forbidden = await request(server())
      .post('/api/v1/categories')
      .set(...bearer(customerToken))
      .send({ name: 'Nope' })
      .expect(403);
    expect(errorCode(forbidden)).toBe('FORBIDDEN');

    const anonymous = await request(server())
      .post('/api/v1/categories')
      .send({ name: 'Nope' })
      .expect(401);
    expect(errorCode(anonymous)).toBe('UNAUTHENTICATED');

    const created = await adminApi(app)
      .post('/api/v1/categories')
      .send({ name: 'Yes' })
      .expect(201);
    expect((created.body as ApiResponse<CategoryResponse>).data.name).toBe(
      'Yes',
    );
    expect(await prisma.category.count()).toBe(1);
  });

  // R1: every write endpoint of Phase 1. Guards run before the handler, so ids need not exist.
  const WRITES: Array<[string, string]> = [
    ['post', '/api/v1/categories'],
    ['post', '/api/v1/products'],
    ['post', '/api/v1/products/p1/variants'],
    ['post', '/api/v1/products/p1/publish'],
    ['post', '/api/v1/products/p1/unpublish'],
    ['post', '/api/v1/channels'],
    ['patch', '/api/v1/channels/c1'],
    ['post', '/api/v1/channels/c1/listings'],
  ];

  it.each(WRITES)(
    '1b. %s %s: anonymous -> 401, customer and staff -> 403',
    async (method, path) => {
      const call = (token?: string): request.Test => {
        const req = (
          request(server()) as unknown as Record<
            string,
            (p: string) => request.Test
          >
        )[method](path);
        return token ? req.set(...bearer(token)) : req;
      };

      expect((await call().send({})).status).toBe(401);
      for (const token of [customerToken, staffToken]) {
        const res = await call(token).send({});
        expect(res.status).toBe(403);
        expect(errorCode(res)).toBe('FORBIDDEN');
      }
    },
  );

  it('1c. storefront reads stay public: categories, channels, health', async () => {
    await request(server()).get('/api/v1/categories').expect(200);
    await request(server()).get('/api/v1/categories/tree').expect(200);
    await request(server()).get('/api/v1/channels').expect(200);
    await request(server()).get('/health').expect(200);
  });

  it('2. a draft product is 404 for anonymous visitors and customers, 200 for staff and admin', async () => {
    const draft = await createProduct('Draft', false);
    const url = `/api/v1/products/${draft.slug}`;

    const anonymous = await request(server()).get(url).expect(404);
    expect(errorCode(anonymous)).toBe('ENTITY_NOT_FOUND');
    await request(server())
      .get(url)
      .set(...bearer(customerToken))
      .expect(404);
    await request(server())
      .get(url)
      .set(...bearer(staffToken))
      .expect(200);
    await adminApi(app).get(url).expect(200);
  });

  it('2a. the same holds when the draft is fetched by id instead of slug', async () => {
    const draft = await createProduct('Draft', false);
    const url = `/api/v1/products/${draft.id}`;

    await request(server()).get(url).expect(404);
    await request(server())
      .get(url)
      .set(...bearer(customerToken))
      .expect(404);
    await request(server())
      .get(url)
      .set(...bearer(staffToken))
      .expect(200);
  });

  it('2b. a published product is visible to everyone', async () => {
    const { slug } = await createProduct('Live', true);

    await request(server()).get(`/api/v1/products/${slug}`).expect(200);
    await request(server())
      .get(`/api/v1/products/${slug}`)
      .set(...bearer(customerToken))
      .expect(200);
  });

  describe('3. is_published filter on GET /products', () => {
    beforeEach(async () => {
      await createProduct('Live', true);
      await createProduct('Draft', false);
    });

    const names = async (token?: string, query = ''): Promise<string[]> => {
      const req = request(server()).get(`/api/v1/products${query}`);
      const res = await (token ? req.set(...bearer(token)) : req).expect(200);
      return (res.body as PaginatedResponse<ProductResponse>).data
        .map((p) => p.name)
        .sort();
    };

    it('visitors and customers get only published products, whatever they ask for', async () => {
      for (const token of [undefined, customerToken]) {
        expect(await names(token)).toEqual(['Live']);
        expect(await names(token, '?is_published=false')).toEqual(['Live']);
      }
    });

    it('staff and admin see drafts and can filter on is_published', async () => {
      expect(await names(staffToken)).toEqual(['Draft', 'Live']);
      expect(await names(staffToken, '?is_published=false')).toEqual(['Draft']);
      expect(await names(staffToken, '?is_published=true')).toEqual(['Live']);
    });

    it('the total of a visitor query counts published products only', async () => {
      const res = await request(server())
        .get('/api/v1/products?is_published=false')
        .expect(200);
      expect((res.body as PaginatedResponse<ProductResponse>).total).toBe(1);
    });
  });

  it('4. an invalid token is rejected on an optional-auth route, but ignored on a public one', async () => {
    await request(server())
      .get('/api/v1/products')
      .set(...bearer('not.a.token'))
      .expect(401);
    await request(server())
      .get('/api/v1/categories')
      .set(...bearer('not.a.token'))
      .expect(200);
  });

  it('5. a revoked admin token is 401 on a protected route', async () => {
    const api = adminApi(app);
    await api.post('/api/v1/categories').send({ name: 'Before' }).expect(201);
    await prisma.user.updateMany({
      where: { email: 'test-admin@example.com' },
      data: { tokenKey: 'c'.repeat(64) },
    });

    await api.post('/api/v1/categories').send({ name: 'After' }).expect(401);
  });
});
