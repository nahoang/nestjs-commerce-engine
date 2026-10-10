import { INestApplication } from '@nestjs/common';
import { createTestApp } from '../helpers/test-app';
import { truncateAll } from '../helpers/db';
import { adminApi, resetWithAdmin } from '../helpers/auth';
import { PrismaService } from '../../src/shared/infrastructure/prisma/prisma.service';
import { ApiResponse, ErrorResponse } from '../../src/shared/api/envelope';
import {
  CategoryResponse,
  CategoryNodeResponse,
} from '../../src/modules/catalog/api/category.response';

describe('CategoriesController Tree & Breadcrumbs (e2e) — DOMAIN-SPEC-1-CATALOG § 1.2', () => {
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

  // Helper function to seed hierarchy:
  // Thời trang (root)
  //   └── Đồ Nam
  //         ├── Áo thun
  //         └── Quần jeans
  async function seedTestHierarchy() {
    const rootRes = await adminApi(app)
      .post('/api/v1/categories')
      .send({ name: 'Thời trang', slug: 'thoi-trang' })
      .expect(201);
    const root = (rootRes.body as ApiResponse<CategoryResponse>).data;

    const menRes = await adminApi(app)
      .post('/api/v1/categories')
      .send({ name: 'Đồ Nam', slug: 'do-nam', parent_id: root.id })
      .expect(201);
    const men = (menRes.body as ApiResponse<CategoryResponse>).data;

    const tshirtRes = await adminApi(app)
      .post('/api/v1/categories')
      .send({ name: 'Áo thun', slug: 'ao-thun', parent_id: men.id })
      .expect(201);
    const tshirt = (tshirtRes.body as ApiResponse<CategoryResponse>).data;

    const jeansRes = await adminApi(app)
      .post('/api/v1/categories')
      .send({ name: 'Quần jeans', slug: 'quan-jeans', parent_id: men.id })
      .expect(201);
    const jeans = (jeansRes.body as ApiResponse<CategoryResponse>).data;

    return { root, men, tshirt, jeans };
  }

  // 1. Tree: Thời trang → Đồ Nam → {Áo thun, Quần jeans} → /tree returns 1 root, children nested over 3 levels, "Áo thun" before "Quần jeans"
  it('1. GET /api/v1/categories/tree returns 1 root, 3 nested levels, and siblings sorted by slug', async () => {
    await seedTestHierarchy();

    const res = await adminApi(app).get('/api/v1/categories/tree').expect(200);

    const body = res.body as ApiResponse<CategoryNodeResponse[]>;
    expect(body.data).toHaveLength(1);

    const rootNode = body.data[0];
    expect(rootNode.name).toBe('Thời trang');
    expect(rootNode.slug).toBe('thoi-trang');
    expect(rootNode.parent_id).toBeNull();
    expect(rootNode.children).toHaveLength(1);

    const menNode = rootNode.children[0];
    expect(menNode.name).toBe('Đồ Nam');
    expect(menNode.slug).toBe('do-nam');
    expect(menNode.parent_id).toBe(rootNode.id);
    expect(menNode.children).toHaveLength(2);

    // R4: Siblings sorted ascending by slug ("ao-thun" < "quan-jeans")
    expect(menNode.children[0].name).toBe('Áo thun');
    expect(menNode.children[0].slug).toBe('ao-thun');
    expect(menNode.children[0].children).toEqual([]);

    expect(menNode.children[1].name).toBe('Quần jeans');
    expect(menNode.children[1].slug).toBe('quan-jeans');
    expect(menNode.children[1].children).toEqual([]);
  });

  // 2. /tree?root_id=do-nam → root is "Đồ Nam"
  it('2. GET /api/v1/categories/tree?root_id=do-nam returns subtree with "Đồ Nam" as root', async () => {
    const { men } = await seedTestHierarchy();

    // Query subtree by slug
    const resBySlug = await adminApi(app)
      .get('/api/v1/categories/tree?root_id=do-nam')
      .expect(200);

    const bodyBySlug = resBySlug.body as ApiResponse<CategoryNodeResponse[]>;
    expect(bodyBySlug.data).toHaveLength(1);
    expect(bodyBySlug.data[0].id).toBe(men.id);
    expect(bodyBySlug.data[0].name).toBe('Đồ Nam');
    expect(bodyBySlug.data[0].children).toHaveLength(2);
    expect(bodyBySlug.data[0].children[0].slug).toBe('ao-thun');
    expect(bodyBySlug.data[0].children[1].slug).toBe('quan-jeans');

    // Query subtree by ID
    const resById = await adminApi(app)
      .get(`/api/v1/categories/tree?root_id=${men.id}`)
      .expect(200);

    const bodyById = resById.body as ApiResponse<CategoryNodeResponse[]>;
    expect(bodyById.data).toHaveLength(1);
    expect(bodyById.data[0].id).toBe(men.id);
    expect(bodyById.data[0].name).toBe('Đồ Nam');
  });

  // 3. /ao-thun/breadcrumbs → ["Thời trang", "Đồ Nam", "Áo thun"] in order
  it('3. GET /api/v1/categories/:slugOrId/breadcrumbs returns ordered breadcrumbs from root to leaf', async () => {
    const { root, men, tshirt } = await seedTestHierarchy();

    // By slug
    const res = await adminApi(app)
      .get('/api/v1/categories/ao-thun/breadcrumbs')
      .expect(200);

    const body = res.body as ApiResponse<CategoryResponse[]>;
    expect(body.data).toHaveLength(3);
    expect(body.data[0].id).toBe(root.id);
    expect(body.data[0].name).toBe('Thời trang');
    expect(body.data[1].id).toBe(men.id);
    expect(body.data[1].name).toBe('Đồ Nam');
    expect(body.data[2].id).toBe(tshirt.id);
    expect(body.data[2].name).toBe('Áo thun');

    // By ID
    const resById = await adminApi(app)
      .get(`/api/v1/categories/${tshirt.id}/breadcrumbs`)
      .expect(200);

    const bodyById = resById.body as ApiResponse<CategoryResponse[]>;
    expect(bodyById.data).toHaveLength(3);
    expect(bodyById.data[0].slug).toBe('thoi-trang');
    expect(bodyById.data[1].slug).toBe('do-nam');
    expect(bodyById.data[2].slug).toBe('ao-thun');
  });

  // 4. Breadcrumbs of a root category → single-element array
  it('4. GET /api/v1/categories/:slugOrId/breadcrumbs for root category returns single item array', async () => {
    const { root } = await seedTestHierarchy();

    const res = await adminApi(app)
      .get(`/api/v1/categories/${root.slug}/breadcrumbs`)
      .expect(200);

    const body = res.body as ApiResponse<CategoryResponse[]>;
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe(root.id);
    expect(body.data[0].name).toBe('Thời trang');
    expect(body.data[0].parent_id).toBeNull();
  });

  // Error Cases: 404 ENTITY_NOT_FOUND
  it('should return 404 ENTITY_NOT_FOUND when root_id does not exist', async () => {
    const res = await adminApi(app)
      .get('/api/v1/categories/tree?root_id=nonexistent-root')
      .expect(404);

    const body = res.body as ErrorResponse;
    expect(body.error_code).toBe('ENTITY_NOT_FOUND');
  });

  it('should return 404 ENTITY_NOT_FOUND when breadcrumbs target does not exist', async () => {
    const res = await adminApi(app)
      .get('/api/v1/categories/nonexistent-leaf/breadcrumbs')
      .expect(404);

    const body = res.body as ErrorResponse;
    expect(body.error_code).toBe('ENTITY_NOT_FOUND');
  });
});
