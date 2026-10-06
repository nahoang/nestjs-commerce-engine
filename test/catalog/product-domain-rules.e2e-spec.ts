import { INestApplication } from '@nestjs/common';
import { Server } from 'http';
import * as request from 'supertest';
import { createTestApp } from '../helpers/test-app';
import { truncateAll } from '../helpers/db';
import { PrismaService } from '../../src/shared/infrastructure/prisma/prisma.service';
import { ApiResponse, ErrorResponse } from '../../src/shared/api/envelope';
import { ProductResponse } from '../../src/modules/catalog/api/product.response';
import { VariantResponse } from '../../src/modules/catalog/api/variant.response';
import { CategoryResponse } from '../../src/modules/catalog/api/category.response';

describe('Product domain rules (e2e) — DOMAIN-SPEC-1-CATALOG § 1.5', () => {
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

  const createProduct = (body: Record<string, unknown>): request.Test =>
    request(server()).post('/api/v1/products').send(body);

  const addVariant = (
    productId: string,
    body: Record<string, unknown>,
  ): request.Test =>
    request(server()).post(`/api/v1/products/${productId}/variants`).send(body);

  const newProduct = async (
    body: Record<string, unknown> = { name: 'Base product' },
  ): Promise<ProductResponse> =>
    (
      (await createProduct(body).expect(201))
        .body as ApiResponse<ProductResponse>
    ).data;

  // 4. R1: a client slug must be valid and is never corrected
  describe('R1: client-supplied slug', () => {
    it('4. POST /products with slug "Ao Thun" returns 422 on field slug and creates nothing', async () => {
      const res = await createProduct({
        name: 'Ao Thun',
        slug: 'Ao Thun',
      }).expect(422);

      const body = res.body as ErrorResponse;
      expect(body.error_code).toBe('VALIDATION_ERROR');
      expect(body.errors?.map((e) => e.field)).toEqual(['slug']);
      expect(await prisma.product.count()).toBe(0);
    });

    it('4b. POST /categories with an invalid slug returns 422 on field slug', async () => {
      const res = await request(server())
        .post('/api/v1/categories')
        .send({ name: 'Do Nam', slug: 'Do_Nam' })
        .expect(422);

      expect((res.body as ErrorResponse).errors?.map((e) => e.field)).toEqual([
        'slug',
      ]);
    });

    it('4c. a valid slug is used as given; a blank slug falls back to the generated one', async () => {
      const custom = await newProduct({ name: 'Anything', slug: 'my-slug' });
      expect(custom.slug).toBe('my-slug');

      const generated = await newProduct({ name: 'Đồ Nam', slug: '   ' });
      expect(generated.slug).toBe('do-nam');
    });

    it('4d. a name that produces an out-of-invariant slug is repaired, never rejected', async () => {
      const product = await newProduct({ name: 'snake_case -- name_' });
      expect(product.slug).toBe('snake-case-name');

      const category = (
        (
          await request(server())
            .post('/api/v1/categories')
            .send({ name: '_Hidden_' })
            .expect(201)
        ).body as ApiResponse<CategoryResponse>
      ).data;
      expect(category.slug).toBe('hidden');
    });
  });

  // 5. R2: SKUs ignore case
  describe('R2: case-insensitive SKU', () => {
    it('5. adding "ts-m" when "TS-M" exists returns 409', async () => {
      const product = await newProduct({
        name: 'Tee',
        variants: [{ sku: 'TS-M', name: 'M', price_amount: '10' }],
      });

      const res = await addVariant(product.id, {
        sku: 'ts-m',
        name: 'lower',
        price_amount: '10',
      }).expect(409);

      expect((res.body as ErrorResponse).error_code).toBe('DUPLICATE_ENTITY');
      expect(await prisma.productVariant.count()).toBe(1);
    });

    it('5b. the SKU is stored and returned in its normalized upper-case form', async () => {
      const product = await newProduct({ name: 'Tee' });

      const res = await addVariant(product.id, {
        sku: '  ts-m_01 ',
        name: 'M',
        price_amount: '10',
      }).expect(201);

      expect((res.body as ApiResponse<VariantResponse>).data.sku).toBe(
        'TS-M_01',
      );
      const stored = await prisma.productVariant.findFirstOrThrow();
      expect(stored.sku).toBe('TS-M_01');
    });

    it('5c. "ts-m" on another product also conflicts with "TS-M" (system-wide)', async () => {
      await newProduct({
        name: 'First',
        variants: [{ sku: 'TS-M', name: 'M', price_amount: '10' }],
      });
      const other = await newProduct({ name: 'Second' });

      await addVariant(other.id, {
        sku: 'ts-m',
        name: 'M',
        price_amount: '10',
      }).expect(409);
    });

    it('5d. SKUs that differ only by case inside one payload return 409 and create no product', async () => {
      await createProduct({
        name: 'Payload dup',
        variants: [
          { sku: 'a-1', name: 'A', price_amount: '1' },
          { sku: 'A-1', name: 'B', price_amount: '2' },
        ],
      }).expect(409);

      expect(await prisma.product.count()).toBe(0);
    });

    it('5e. an invalid SKU returns 422 with the nested field path', async () => {
      const res = await createProduct({
        name: 'Bad sku',
        variants: [
          { sku: 'OK-1', name: 'A', price_amount: '1' },
          { sku: 'not valid!', name: 'B', price_amount: '1' },
        ],
      }).expect(422);

      expect((res.body as ErrorResponse).errors?.map((e) => e.field)).toEqual([
        'variants.1.sku',
      ]);
    });
  });

  // 6. R3: publish only with at least one variant
  describe('R3: publish / unpublish', () => {
    it('6. publishing a product without variants returns 400; with a variant returns 200 and is_published = true', async () => {
      const product = await newProduct({ name: 'Draft' });

      const refused = await request(server())
        .post(`/api/v1/products/${product.id}/publish`)
        .expect(400);
      expect((refused.body as ErrorResponse).error_code).toBe(
        'INVALID_OPERATION',
      );
      expect(
        (await prisma.product.findUniqueOrThrow({ where: { id: product.id } }))
          .isPublished,
      ).toBe(false);

      await addVariant(product.id, {
        sku: 'D-1',
        name: 'One',
        price_amount: '5',
      }).expect(201);

      const published = await request(server())
        .post(`/api/v1/products/${product.id}/publish`)
        .expect(200);
      const data = (published.body as ApiResponse<ProductResponse>).data;
      expect(data.is_published).toBe(true);
      expect(data.variants).toHaveLength(1);
      expect(
        (await prisma.product.findUniqueOrThrow({ where: { id: product.id } }))
          .isPublished,
      ).toBe(true);
    });

    it('6b. unpublish returns the product to draft; both calls are idempotent', async () => {
      const product = await newProduct({
        name: 'Live',
        variants: [{ sku: 'L-1', name: 'One', price_amount: '5' }],
      });
      const publish = (): request.Test =>
        request(server()).post(`/api/v1/products/${product.id}/publish`);
      const unpublish = (): request.Test =>
        request(server()).post(`/api/v1/products/${product.id}/unpublish`);

      await publish().expect(200);
      const afterFirst = await prisma.product.findUniqueOrThrow({
        where: { id: product.id },
      });
      await publish().expect(200);
      const afterSecond = await prisma.product.findUniqueOrThrow({
        where: { id: product.id },
      });
      // a no-op publish must not change the stored row
      expect(afterSecond.updatedAt).toEqual(afterFirst.updatedAt);

      const draft = await unpublish().expect(200);
      expect(
        (draft.body as ApiResponse<ProductResponse>).data.is_published,
      ).toBe(false);
      await unpublish().expect(200);
    });

    it('6c. publish / unpublish of an unknown product return 404', async () => {
      const id = '00000000-0000-0000-0000-000000000000';

      const publish = await request(server())
        .post(`/api/v1/products/${id}/publish`)
        .expect(404);
      expect((publish.body as ErrorResponse).error_code).toBe(
        'ENTITY_NOT_FOUND',
      );
      await request(server())
        .post(`/api/v1/products/${id}/unpublish`)
        .expect(404);
    });

    it('6d. creating with is_published=true and no variants returns 400 and creates nothing', async () => {
      const res = await createProduct({
        name: 'Eager',
        is_published: true,
      }).expect(400);

      expect((res.body as ErrorResponse).error_code).toBe('INVALID_OPERATION');
      expect(await prisma.product.count()).toBe(0);
    });

    it('6e. creating with is_published=true and variants returns 201 published', async () => {
      const product = await newProduct({
        name: 'Eager ok',
        is_published: true,
        variants: [{ sku: 'E-1', name: 'One', price_amount: '5' }],
      });

      expect(product.is_published).toBe(true);
      const stored = await prisma.product.findUniqueOrThrow({
        where: { id: product.id },
      });
      expect(stored.isPublished).toBe(true);
    });
  });

  // 7. R4: one currency per product
  describe('R4: a single currency per product', () => {
    it('7. adding a VND variant to a product that has a USD variant returns 400', async () => {
      const product = await newProduct({
        name: 'USD tee',
        variants: [
          { sku: 'U-1', name: 'M', price_amount: '10', currency: 'USD' },
        ],
      });

      const res = await addVariant(product.id, {
        sku: 'U-2',
        name: 'L',
        price_amount: '250000',
        currency: 'VND',
      }).expect(400);

      expect((res.body as ErrorResponse).error_code).toBe('INVALID_OPERATION');
      expect(await prisma.productVariant.count()).toBe(1);
    });

    it('7b. mixed currencies in one create payload return 400 and create no product', async () => {
      await createProduct({
        name: 'Mixed',
        variants: [
          { sku: 'M-1', name: 'A', price_amount: '1', currency: 'USD' },
          { sku: 'M-2', name: 'B', price_amount: '1', currency: 'vnd' },
        ],
      }).expect(400);

      expect(await prisma.product.count()).toBe(0);
    });

    it('7c. the same currency in different case is the same currency', async () => {
      const product = await newProduct({
        name: 'Case',
        variants: [
          { sku: 'C-1', name: 'A', price_amount: '1', currency: 'vnd' },
        ],
      });

      await addVariant(product.id, {
        sku: 'C-2',
        name: 'B',
        price_amount: '2',
        currency: 'VND',
      }).expect(201);
    });
  });
});
