import { INestApplication } from '@nestjs/common';
import { createTestApp } from '../helpers/test-app';
import { truncateAll } from '../helpers/db';
import { adminApi, resetWithAdmin } from '../helpers/auth';
import { runConcurrently } from '../helpers/concurrency';
import { PrismaService } from '../../src/shared/infrastructure/prisma/prisma.service';
import { ApiResponse } from '../../src/shared/api/envelope';
import { ProductResponse } from '../../src/modules/catalog/api/product.response';

describe('Variant SKU uniqueness under concurrency (e2e) — DOMAIN-SPEC-1-CATALOG § 1.4 R1', () => {
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

  it('exactly one of N simultaneous requests wins a SKU; the others get 409', async () => {
    const created = await adminApi(app)
      .post('/api/v1/products')
      .send({ name: 'Race product' })
      .expect(201);
    const productId = (created.body as ApiResponse<ProductResponse>).data.id;

    const statuses = await runConcurrently(8, async (i) => {
      const res = await adminApi(app)
        .post(`/api/v1/products/${productId}/variants`)
        .send({ sku: 'RACE-1', name: `Attempt ${i}`, price_amount: '1.00' });
      return res.status;
    });

    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(7);
    expect(
      await prisma.productVariant.count({ where: { sku: 'RACE-1' } }),
    ).toBe(1);
  });
});
