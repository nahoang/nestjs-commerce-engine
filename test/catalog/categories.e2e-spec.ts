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
import { CategoryResponse } from '../../src/modules/catalog/api/category.response';

describe('CategoriesController (e2e) — DOMAIN-SPEC-1-CATALOG § 1.1', () => {
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

  // 1. Create "Thời trang" (no slug) → slug = "thoi-trang", parent_id = null
  it('1. POST /api/v1/categories without slug auto-slugifies name and sets parent_id = null', async () => {
    const res = await adminApi(app)
      .post('/api/v1/categories')
      .send({ name: 'Thời trang' })
      .expect(201);

    const body = res.body as ApiResponse<CategoryResponse>;
    expect(body.data).toBeDefined();
    expect(body.data.id).toBeDefined();
    expect(body.data.name).toBe('Thời trang');
    expect(body.data.slug).toBe('thoi-trang');
    expect(body.data.parent_id).toBeNull();
    expect(body.data.is_active).toBe(true);
    expect(body.data.created_at).toBeDefined();
    expect(body.data.updated_at).toBeDefined();
  });

  // 2. Create "Đồ Nam" with parent_id = id of "Thời trang" → 201, correct parent_id
  it('2. POST /api/v1/categories with parent_id sets parent hierarchy correctly', async () => {
    const parentRes = await adminApi(app)
      .post('/api/v1/categories')
      .send({ name: 'Thời trang' })
      .expect(201);

    const parentId = (parentRes.body as ApiResponse<CategoryResponse>).data.id;

    const childRes = await adminApi(app)
      .post('/api/v1/categories')
      .send({ name: 'Đồ Nam', parent_id: parentId })
      .expect(201);

    const childBody = childRes.body as ApiResponse<CategoryResponse>;
    expect(childBody.data.name).toBe('Đồ Nam');
    expect(childBody.data.slug).toBe('do-nam');
    expect(childBody.data.parent_id).toBe(parentId);
  });

  // 3. Create a category with a non-existent parent_id → 404 ENTITY_NOT_FOUND
  it('3. POST /api/v1/categories with non-existent parent_id returns 404 ENTITY_NOT_FOUND', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    const res = await adminApi(app)
      .post('/api/v1/categories')
      .send({ name: 'Đồ Nam', parent_id: nonExistentId })
      .expect(404);

    const body = res.body as ErrorResponse;
    expect(body.error_code).toBe('ENTITY_NOT_FOUND');
  });

  // 4. Create two categories with the same slug → second returns 409 DUPLICATE_ENTITY
  it('4. POST /api/v1/categories with duplicate slug returns 409 DUPLICATE_ENTITY', async () => {
    await adminApi(app)
      .post('/api/v1/categories')
      .send({ name: 'Thời trang' })
      .expect(201);

    const res = await adminApi(app)
      .post('/api/v1/categories')
      .send({ name: 'Thời trang' })
      .expect(409);

    const body = res.body as ErrorResponse;
    expect(body.error_code).toBe('DUPLICATE_ENTITY');
  });

  // 5. name = "" → 422 VALIDATION_ERROR, errors[].field = "name"
  it('5. POST /api/v1/categories with empty name returns 422 VALIDATION_ERROR with errors[].field = "name"', async () => {
    const res = await adminApi(app)
      .post('/api/v1/categories')
      .send({ name: '' })
      .expect(422);

    const body = res.body as ErrorResponse;
    expect(body.error_code).toBe('VALIDATION_ERROR');
    expect(body.errors).toBeDefined();
    expect(body.errors?.some((err) => err.field === 'name')).toBe(true);
  });

  // 6. List with limit=1 when 2 categories exist → total=2, page=1, page_size=1, has_next=true
  it('6. GET /api/v1/categories with limit=1 when 2 exist returns paginated envelope', async () => {
    await adminApi(app)
      .post('/api/v1/categories')
      .send({ name: 'Thời trang' })
      .expect(201);

    await adminApi(app)
      .post('/api/v1/categories')
      .send({ name: 'Đồ Nam' })
      .expect(201);

    const res = await adminApi(app)
      .get('/api/v1/categories?limit=1&offset=0')
      .expect(200);

    const body = res.body as PaginatedResponse<CategoryResponse>;
    expect(body.data).toHaveLength(1);
    expect(body.total).toBe(2);
    expect(body.page).toBe(1);
    expect(body.page_size).toBe(1);
    expect(body.has_next).toBe(true);
  });

  // 7. Get details by slug and by id → identical result
  it('7. GET /api/v1/categories/:slugOrId returns identical result by slug and by id', async () => {
    const createRes = await adminApi(app)
      .post('/api/v1/categories')
      .send({ name: 'Giày dép' })
      .expect(201);

    const created = (createRes.body as ApiResponse<CategoryResponse>).data;

    // By slug
    const bySlugRes = await adminApi(app)
      .get(`/api/v1/categories/${created.slug}`)
      .expect(200);

    // By id
    const byIdRes = await adminApi(app)
      .get(`/api/v1/categories/${created.id}`)
      .expect(200);

    const bySlugData = (bySlugRes.body as ApiResponse<CategoryResponse>).data;
    const byIdData = (byIdRes.body as ApiResponse<CategoryResponse>).data;

    expect(bySlugData.id).toBe(created.id);
    expect(byIdData.id).toBe(created.id);
    expect(bySlugData.slug).toBe(created.slug);
    expect(byIdData.slug).toBe(created.slug);
    expect(bySlugData).toEqual(byIdData);
  });
});
