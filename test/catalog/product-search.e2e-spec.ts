import { INestApplication } from '@nestjs/common';
import { Server } from 'http';
import * as request from 'supertest';
import { createTestApp } from '../helpers/test-app';
import { truncateAll } from '../helpers/db';
import { PrismaService } from '../../src/shared/infrastructure/prisma/prisma.service';
import {
  ApiResponse,
  ErrorResponse,
  PaginatedResponse,
} from '../../src/shared/api/envelope';
import { ProductResponse } from '../../src/modules/catalog/api/product.response';
import { CategoryResponse } from '../../src/modules/catalog/api/category.response';

describe('Product search (e2e) — DOMAIN-SPEC-1-CATALOG § 1.6', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let menId: string;
  let teeId: string;

  const server = (): Server => app.getHttpServer() as Server;

  async function createCategory(
    name: string,
    parentId?: string,
  ): Promise<string> {
    const res = await request(server())
      .post('/api/v1/categories')
      .send({ name, parent_id: parentId })
      .expect(201);
    return (res.body as ApiResponse<CategoryResponse>).data.id;
  }

  async function createProduct(body: {
    name: string;
    description?: string;
    category_id?: string;
    is_published?: boolean;
    variants: Array<{ sku: string; price: string; currency: string }>;
  }): Promise<void> {
    await request(server())
      .post('/api/v1/products')
      .send({
        ...body,
        variants: body.variants.map((v) => ({
          sku: v.sku,
          name: v.sku,
          price_amount: v.price,
          currency: v.currency,
        })),
      })
      .expect(201);
  }

  async function search(
    query: Record<string, string | number>,
  ): Promise<PaginatedResponse<ProductResponse>> {
    const res = await request(server())
      .get('/api/v1/products')
      .query(query)
      .expect(200);
    return res.body as PaginatedResponse<ProductResponse>;
  }

  const names = (page: PaginatedResponse<ProductResponse>): string[] =>
    page.data.map((p) => p.name);

  // Seed: Thời trang -> Đồ Nam -> Áo thun; creation order Áo Thun .. Áo Khoác (the last is newest)
  beforeAll(async () => {
    const context = await createTestApp();
    app = context.app;
    prisma = context.prisma;
    await truncateAll(prisma);

    const rootId = await createCategory('Thời trang');
    menId = await createCategory('Đồ Nam', rootId);
    teeId = await createCategory('Áo thun', menId);

    await createProduct({
      name: 'Áo Thun',
      category_id: teeId,
      variants: [
        { sku: 'A1', price: '150000', currency: 'VND' },
        { sku: 'A2', price: '90000', currency: 'VND' },
      ],
    });
    await createProduct({
      name: 'Áo Sơ Mi',
      category_id: menId,
      variants: [{ sku: 'B1', price: '250000', currency: 'VND' }],
    });
    await createProduct({
      name: 'Quần Jean',
      description: 'Phối cùng áo thun',
      category_id: menId,
      variants: [{ sku: 'C1', price: '300000', currency: 'VND' }],
    });
    await createProduct({
      name: 'Váy Xòe',
      category_id: rootId,
      variants: [{ sku: 'D1', price: '500000', currency: 'VND' }],
    });
    await createProduct({
      name: 'Mũ Lưỡi Trai',
      variants: [{ sku: 'E1', price: '15', currency: 'USD' }],
    });
    await createProduct({
      name: 'Áo Khoác',
      category_id: teeId,
      is_published: true,
      variants: [
        { sku: 'F1', price: '120000', currency: 'VND' },
        { sku: 'F2', price: '400000', currency: 'VND' },
      ],
    });
  });

  afterAll(async () => {
    await truncateAll(prisma);
    await app.close();
  });

  it('1. keyword matches name or description, ignoring case', async () => {
    const page = await search({ keyword: 'ÁO' });
    expect(names(page).sort()).toEqual(
      ['Quần Jean', 'Áo Khoác', 'Áo Sơ Mi', 'Áo Thun'].sort(),
    );
    expect(page.total).toBe(4);
  });

  it('1b. LIKE wildcards in keyword are matched literally', async () => {
    expect((await search({ keyword: '%' })).total).toBe(0);
    expect((await search({ keyword: '_' })).total).toBe(0);
  });

  it('2. category_id includes products of descendant categories', async () => {
    const page = await search({ category_id: menId });
    expect(names(page).sort()).toEqual(
      ['Quần Jean', 'Áo Khoác', 'Áo Sơ Mi', 'Áo Thun'].sort(),
    );
    const leaf = await search({ category_id: teeId });
    expect(names(leaf).sort()).toEqual(['Áo Khoác', 'Áo Thun'].sort());
  });

  it('2b. unknown category_id -> 404', async () => {
    const res = await request(server())
      .get('/api/v1/products')
      .query({ category_id: '00000000-0000-0000-0000-000000000000' })
      .expect(404);
    expect((res.body as ErrorResponse).error_code).toBe('ENTITY_NOT_FOUND');
  });

  it('3. price range uses the lowest same-currency variant price (inclusive bounds)', async () => {
    const page = await search({
      min_price: '100000',
      max_price: '300000',
      currency: 'vnd',
    });
    // Áo Thun (lowest 90000) is out although it has a 150000 variant; USD-only Mũ is out
    expect(names(page).sort()).toEqual(
      ['Quần Jean', 'Áo Khoác', 'Áo Sơ Mi'].sort(),
    );
    expect(page.total).toBe(3);
  });

  it('3b. a USD range only sees USD variants', async () => {
    const page = await search({ max_price: '20', currency: 'USD' });
    expect(names(page)).toEqual(['Mũ Lưỡi Trai']);
  });

  it.each([
    [{ min_price: '100000' }, 'currency'],
    [{ max_price: '100000' }, 'currency'],
    [{ sort_by: 'price_asc' }, 'currency'],
    [{ sort_by: 'price_desc' }, 'currency'],
    [{ min_price: '300', max_price: '100', currency: 'VND' }, 'max_price'],
    [{ min_price: '-1', currency: 'VND' }, 'min_price'],
    [{ min_price: '1.234', currency: 'VND' }, 'min_price'],
    [{ currency: 'dong' }, 'currency'],
    [{ sort_by: 'cheapest' }, 'sort_by'],
    [{ is_published: 'maybe' }, 'is_published'],
  ])('4. invalid query %j -> 422 on %s', async (query, field) => {
    const res = await request(server())
      .get('/api/v1/products')
      .query(query)
      .expect(422);
    const body = res.body as ErrorResponse;
    expect(body.errors?.map((e) => e.field)).toContain(field);
  });

  it('5. price_asc / price_desc order by lowest price; newest is the default', async () => {
    const asc = await search({ sort_by: 'price_asc', currency: 'VND' });
    expect(names(asc)).toEqual([
      'Áo Thun',
      'Áo Khoác',
      'Áo Sơ Mi',
      'Quần Jean',
      'Váy Xòe',
    ]);
    const desc = await search({ sort_by: 'price_desc', currency: 'VND' });
    expect(names(desc)).toEqual([...names(asc)].reverse());

    const newest = await search({ sort_by: 'newest' });
    expect(names(newest)[0]).toBe('Áo Khoác');
    expect(names(newest)[5]).toBe('Áo Thun');
    expect(names(await search({}))).toEqual(names(newest));
  });

  it('5b. name_asc returns every product ordered by name', async () => {
    const page = await search({ sort_by: 'name_asc' });
    expect(page.total).toBe(6);
    expect(names(page)).toEqual(
      [...names(page)].sort((a, b) => a.localeCompare(b)),
    );
  });

  it('6. filters combine with AND and total counts the filtered set', async () => {
    const filters = {
      keyword: 'áo',
      category_id: menId,
      min_price: '100000',
      max_price: '260000',
      currency: 'VND',
      sort_by: 'price_desc',
      limit: 1,
    };
    const first = await search(filters);
    expect(first.total).toBe(2);
    expect(names(first)).toEqual(['Áo Sơ Mi']);
    expect(first.has_next).toBe(true);

    const second = await search({ ...filters, offset: 1 });
    expect(names(second)).toEqual(['Áo Khoác']);
    expect(second.has_next).toBe(false);
  });

  it('7. is_published filters on publication state; omitted means no filter', async () => {
    expect(names(await search({ is_published: 'true' }))).toEqual(['Áo Khoác']);
    expect((await search({ is_published: 'false' })).total).toBe(5);
    expect((await search({})).total).toBe(6);
  });

  it('8. SQL metacharacters in keyword are bound, not executed', async () => {
    const page = await search({ keyword: "'; DROP TABLE products; --" });
    expect(page.total).toBe(0);
    expect((await search({})).total).toBe(6);
  });
});
