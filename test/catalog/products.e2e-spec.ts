import { INestApplication } from '@nestjs/common';
import { createTestApp } from '../helpers/test-app';
import { truncateAll } from '../helpers/db';
import { adminApi, resetWithAdmin } from '../helpers/auth';
import { PrismaService } from '../../src/shared/infrastructure/prisma/prisma.service';
import {
  ApiResponse,
  PaginatedResponse,
  ErrorResponse,
} from '../../src/shared/api/envelope';
import { ProductResponse } from '../../src/modules/catalog/api/product.response';
import { CategoryResponse } from '../../src/modules/catalog/api/category.response';

describe('ProductsController (e2e) — DOMAIN-SPEC-1-CATALOG § 1.3', () => {
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

  // 1. Create "Áo Thun Cotton Nam" without a slug → slug is generated, is_published = false
  it('1. POST /api/v1/products without slug auto-slugifies name and defaults to draft', async () => {
    const res = await adminApi(app)
      .post('/api/v1/products')
      .send({ name: 'Áo Thun Cotton Nam' })
      .expect(201);

    const body = res.body as ApiResponse<ProductResponse>;
    expect(body.data.id).toBeDefined();
    expect(body.data.name).toBe('Áo Thun Cotton Nam');
    expect(body.data.slug).toBe('ao-thun-cotton-nam');
    expect(body.data.is_published).toBe(false);
    expect(body.data.category_id).toBeNull();
    expect(body.data.description).toBeNull();
  });

  it('1b. POST with an existing category_id links the product to it, retrievable by slug and id', async () => {
    const catRes = await adminApi(app)
      .post('/api/v1/categories')
      .send({ name: 'Đồ Nam' })
      .expect(201);
    const categoryId = (catRes.body as ApiResponse<CategoryResponse>).data.id;

    const createRes = await adminApi(app)
      .post('/api/v1/products')
      .send({
        name: 'Áo Sơ Mi',
        category_id: categoryId,
        description: 'Description',
      })
      .expect(201);
    const created = (createRes.body as ApiResponse<ProductResponse>).data;
    expect(created.category_id).toBe(categoryId);

    const bySlug = await adminApi(app)
      .get(`/api/v1/products/${created.slug}`)
      .expect(200);
    const byId = await adminApi(app)
      .get(`/api/v1/products/${created.id}`)
      .expect(200);

    expect((bySlug.body as ApiResponse<ProductResponse>).data).toEqual(
      (byId.body as ApiResponse<ProductResponse>).data,
    );
    expect((bySlug.body as ApiResponse<ProductResponse>).data.id).toBe(
      created.id,
    );
  });

  it('1c. GET /api/v1/products/:slugOrId returns 404 for unknown product', async () => {
    const res = await adminApi(app)
      .get('/api/v1/products/khong-ton-tai')
      .expect(404);
    expect((res.body as ErrorResponse).error_code).toBe('ENTITY_NOT_FOUND');
  });

  // 2. Non-existent category_id → 404
  it('2. POST with non-existent category_id returns 404 ENTITY_NOT_FOUND', async () => {
    const res = await adminApi(app)
      .post('/api/v1/products')
      .send({
        name: 'Áo Thun',
        category_id: '00000000-0000-0000-0000-000000000000',
      })
      .expect(404);

    expect((res.body as ErrorResponse).error_code).toBe('ENTITY_NOT_FOUND');
  });

  // 3. Pagination with 5 products
  it('3. GET /api/v1/products paginates 5 products deterministically (newest first)', async () => {
    for (let i = 1; i <= 5; i++) {
      await adminApi(app)
        .post('/api/v1/products')
        .send({ name: `Product ${i}` })
        .expect(201);
    }

    const first = await adminApi(app)
      .get('/api/v1/products?limit=2&offset=0')
      .expect(200);
    const firstBody = first.body as PaginatedResponse<ProductResponse>;
    expect(firstBody.data).toHaveLength(2);
    expect(firstBody.total).toBe(5);
    expect(firstBody.page).toBe(1);
    expect(firstBody.page_size).toBe(2);
    expect(firstBody.has_next).toBe(true);
    expect(firstBody.data.map((p) => p.slug)).toEqual([
      'product-5',
      'product-4',
    ]);

    const last = await adminApi(app)
      .get('/api/v1/products?limit=2&offset=4')
      .expect(200);
    const lastBody = last.body as PaginatedResponse<ProductResponse>;
    expect(lastBody.data).toHaveLength(1);
    expect(lastBody.page).toBe(3);
    expect(lastBody.has_next).toBe(false);
    expect(lastBody.data[0].slug).toBe('product-1');
  });

  // 4. Duplicate slug → 409
  it('4. POST with duplicate slug returns 409 DUPLICATE_ENTITY', async () => {
    await adminApi(app)
      .post('/api/v1/products')
      .send({ name: 'Áo Thun' })
      .expect(201);

    const res = await adminApi(app)
      .post('/api/v1/products')
      .send({ name: 'Áo Thun' })
      .expect(409);

    expect((res.body as ErrorResponse).error_code).toBe('DUPLICATE_ENTITY');
  });

  it('5. POST with empty name returns 422 VALIDATION_ERROR on field name', async () => {
    const res = await adminApi(app)
      .post('/api/v1/products')
      .send({ name: '' })
      .expect(422);

    const body = res.body as ErrorResponse;
    expect(body.error_code).toBe('VALIDATION_ERROR');
    expect(body.errors?.some((e) => e.field === 'name')).toBe(true);
  });

  // R4: deleting a category keeps the product and sets category_id = NULL
  it('R4. deleting a category keeps the product and nulls category_id', async () => {
    const catRes = await adminApi(app)
      .post('/api/v1/categories')
      .send({ name: 'Temporary' })
      .expect(201);
    const categoryId = (catRes.body as ApiResponse<CategoryResponse>).data.id;

    const prodRes = await adminApi(app)
      .post('/api/v1/products')
      .send({ name: 'Keep me', category_id: categoryId })
      .expect(201);
    const productId = (prodRes.body as ApiResponse<ProductResponse>).data.id;

    await prisma.category.delete({ where: { id: categoryId } });

    const res = await adminApi(app)
      .get(`/api/v1/products/${productId}`)
      .expect(200);
    expect(
      (res.body as ApiResponse<ProductResponse>).data.category_id,
    ).toBeNull();
  });
});
