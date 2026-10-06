import { INestApplication } from '@nestjs/common';
import { Server } from 'http';
import * as request from 'supertest';
import { createTestApp } from '../helpers/test-app';
import { truncateAll } from '../helpers/db';
import { PrismaService } from '../../src/shared/infrastructure/prisma/prisma.service';
import {
  ApiResponse,
  PaginatedResponse,
  ErrorResponse,
} from '../../src/shared/api/envelope';
import { ProductResponse } from '../../src/modules/catalog/api/product.response';
import { VariantResponse } from '../../src/modules/catalog/api/variant.response';

describe('Product variants (e2e) — DOMAIN-SPEC-1-CATALOG § 1.4', () => {
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

  // 1. Product with 3 variants M/L/XL -> detail returns all 3, price_amount is a decimal string
  it('1. creates a product with 3 variants; detail returns decimal-string prices', async () => {
    const res = await createProduct({
      name: 'Áo Thun Cotton',
      variants: [
        { sku: 'TS-M', name: 'M', price_amount: '250000.00' },
        { sku: 'TS-L', name: 'L', price_amount: '250000' },
        { sku: 'TS-XL', name: 'XL', price_amount: 275000.5, currency: 'usd' },
      ],
    }).expect(201);

    const created = (res.body as ApiResponse<ProductResponse>).data;
    expect(created.variants).toHaveLength(3);

    const detail = await request(server())
      .get(`/api/v1/products/${created.slug}`)
      .expect(200);
    const variants = (detail.body as ApiResponse<ProductResponse>).data
      .variants;

    expect(variants).toHaveLength(3);
    const byName = Object.fromEntries(variants.map((v) => [v.name, v]));
    expect(byName['M'].price_amount).toBe('250000.00');
    expect(byName['L'].price_amount).toBe('250000.00');
    expect(byName['XL'].price_amount).toBe('275000.50');
    expect(byName['M'].currency).toBe('USD');
    // lower-case 'usd' is normalized; all variants of a product share one currency (1.5 R4)
    expect(byName['XL'].currency).toBe('USD');
    expect(variants.every((v) => v.product_id === created.id)).toBe(true);
  });

  // 2. Two variants with the same SKU in one payload -> 409 and no product is created
  it('2. duplicate SKU inside the payload returns 409 and creates no product', async () => {
    const res = await createProduct({
      name: 'Dup Payload',
      variants: [
        { sku: 'SAME', name: 'A', price_amount: '1.00' },
        { sku: 'SAME', name: 'B', price_amount: '2.00' },
      ],
    }).expect(409);

    expect((res.body as ErrorResponse).error_code).toBe('DUPLICATE_ENTITY');
    expect(await prisma.product.count()).toBe(0);
    expect(await prisma.productVariant.count()).toBe(0);
  });

  // R7: a SKU that already exists in the database fails the whole creation (rollback)
  it('2b. SKU already used by another product returns 409 and rolls back the new product', async () => {
    await createProduct({
      name: 'First',
      variants: [{ sku: 'TAKEN', name: 'A', price_amount: '1.00' }],
    }).expect(201);

    const res = await createProduct({
      name: 'Second',
      variants: [
        { sku: 'FRESH', name: 'A', price_amount: '1.00' },
        { sku: 'TAKEN', name: 'B', price_amount: '2.00' },
      ],
    }).expect(409);

    expect((res.body as ErrorResponse).error_code).toBe('DUPLICATE_ENTITY');
    expect(await prisma.product.count()).toBe(1);
    expect(await prisma.productVariant.count()).toBe(1);
  });

  // 3. Adding a variant whose SKU exists on another product -> 409
  it('3. POST /products/:id/variants with a SKU of another product returns 409', async () => {
    await createProduct({
      name: 'Owner',
      variants: [{ sku: 'SKU-1', name: 'A', price_amount: '1.00' }],
    }).expect(201);
    const other = (
      (await createProduct({ name: 'Other' }).expect(201))
        .body as ApiResponse<ProductResponse>
    ).data;

    const res = await request(server())
      .post(`/api/v1/products/${other.id}/variants`)
      .send({ sku: 'SKU-1', name: 'B', price_amount: '2.00' })
      .expect(409);

    expect((res.body as ErrorResponse).error_code).toBe('DUPLICATE_ENTITY');
  });

  it('3b. POST /products/:id/variants adds a variant visible in the product detail', async () => {
    const product = (
      (await createProduct({ name: 'Grow' }).expect(201))
        .body as ApiResponse<ProductResponse>
    ).data;

    const res = await request(server())
      .post(`/api/v1/products/${product.id}/variants`)
      .send({ sku: 'G-1', name: 'One', price_amount: '19.9' })
      .expect(201);
    const variant = (res.body as ApiResponse<VariantResponse>).data;
    expect(variant.product_id).toBe(product.id);
    expect(variant.price_amount).toBe('19.90');
    expect(variant.currency).toBe('USD');

    const detail = await request(server())
      .get(`/api/v1/products/${product.id}`)
      .expect(200);
    expect(
      (detail.body as ApiResponse<ProductResponse>).data.variants.map(
        (v) => v.sku,
      ),
    ).toEqual(['G-1']);
  });

  // 4. Validation: price >= 0 with at most 2 decimals, ISO currency normalized to upper case
  it.each([['-1'], [-1], ['1.234'], ['abc'], [1e21], ['']])(
    '4. price_amount %p returns 422 on variants.0.price_amount',
    async (price) => {
      const res = await createProduct({
        name: 'Bad price',
        variants: [{ sku: 'BAD-1', name: 'A', price_amount: price }],
      }).expect(422);

      const body = res.body as ErrorResponse;
      expect(body.error_code).toBe('VALIDATION_ERROR');
      expect(
        body.errors?.some((e) => e.field === 'variants.0.price_amount'),
      ).toBe(true);
      expect(await prisma.product.count()).toBe(0);
    },
  );

  it('4b. currency "us" returns 422; "vnd" is stored as "VND"', async () => {
    const product = (
      (await createProduct({ name: 'Currency' }).expect(201))
        .body as ApiResponse<ProductResponse>
    ).data;
    const url = `/api/v1/products/${product.id}/variants`;

    const bad = await request(server())
      .post(url)
      .send({ sku: 'C-1', name: 'A', price_amount: '1', currency: 'us' })
      .expect(422);
    expect(
      (bad.body as ErrorResponse).errors?.some((e) => e.field === 'currency'),
    ).toBe(true);

    const good = await request(server())
      .post(url)
      .send({ sku: 'C-2', name: 'A', price_amount: '1', currency: 'vnd' })
      .expect(201);
    expect((good.body as ApiResponse<VariantResponse>).data.currency).toBe(
      'VND',
    );
  });

  it('4c. price_amount keeps full precision (no float rounding)', async () => {
    const product = (
      (await createProduct({ name: 'Precision' }).expect(201))
        .body as ApiResponse<ProductResponse>
    ).data;

    const res = await request(server())
      .post(`/api/v1/products/${product.id}/variants`)
      .send({ sku: 'P-1', name: 'A', price_amount: '9999999999.99' })
      .expect(201);
    expect((res.body as ApiResponse<VariantResponse>).data.price_amount).toBe(
      '9999999999.99',
    );
  });

  // 5. Unknown product -> 404
  it('5. POST variant for an unknown product returns 404 ENTITY_NOT_FOUND', async () => {
    const res = await request(server())
      .post('/api/v1/products/00000000-0000-0000-0000-000000000000/variants')
      .send({ sku: 'X-1', name: 'A', price_amount: '1' })
      .expect(404);
    expect((res.body as ErrorResponse).error_code).toBe('ENTITY_NOT_FOUND');
  });

  // R5: deleting a product cascades to its variants
  it('R5. deleting a product deletes its variants', async () => {
    const product = (
      (
        await createProduct({
          name: 'Cascade',
          variants: [{ sku: 'CAS-1', name: 'A', price_amount: '1' }],
        }).expect(201)
      ).body as ApiResponse<ProductResponse>
    ).data;
    expect(await prisma.productVariant.count()).toBe(1);

    await prisma.product.delete({ where: { id: product.id } });
    expect(await prisma.productVariant.count()).toBe(0);
  });

  // R6: the number of queries to list N products with variants does not depend on N
  describe('R6. no N+1 when listing products with variants', () => {
    async function seed(count: number): Promise<void> {
      await truncateAll(prisma);
      for (let i = 0; i < count; i++) {
        await prisma.product.create({
          data: {
            name: `P ${i}`,
            slug: `p-${i}`,
            variants: {
              create: [
                { sku: `P${i}-A`, name: 'A', priceAmount: '1.00' },
                { sku: `P${i}-B`, name: 'B', priceAmount: '2.00' },
                { sku: `P${i}-C`, name: 'C', priceAmount: '3.00' },
              ],
            },
          },
        });
      }
    }

    async function countQueriesForList(limit: number): Promise<number> {
      let counting = true;
      let queries = 0;
      prisma.$on('query', () => {
        if (counting) {
          queries++;
        }
      });
      try {
        const res = await request(server())
          .get(`/api/v1/products?limit=${limit}`)
          .expect(200);
        const body = res.body as PaginatedResponse<ProductResponse>;
        expect(body.data).toHaveLength(limit);
        expect(body.data.every((p) => p.variants.length === 3)).toBe(true);
      } finally {
        counting = false;
      }
      return queries;
    }

    it('uses the same number of queries for 10 and for 20 products', async () => {
      await seed(10);
      const queriesFor10 = await countQueriesForList(10);

      await seed(20);
      const queriesFor20 = await countQueriesForList(20);

      expect(queriesFor20).toBe(queriesFor10);
      // Far below one query per product: products + variants (+ count + tx control)
      expect(queriesFor10).toBeLessThan(10);
    });
  });
});
