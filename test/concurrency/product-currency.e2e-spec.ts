import { INestApplication } from '@nestjs/common';
import { createTestApp } from '../helpers/test-app';
import { truncateAll } from '../helpers/db';
import { adminApi, resetWithAdmin } from '../helpers/auth';
import { runConcurrently } from '../helpers/concurrency';
import { PrismaService } from '../../src/shared/infrastructure/prisma/prisma.service';
import { ApiResponse } from '../../src/shared/api/envelope';
import { ProductResponse } from '../../src/modules/catalog/api/product.response';

describe('Product aggregate invariants under concurrency (e2e) — DOMAIN-SPEC-1-CATALOG § 1.5 R4', () => {
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

  it('simultaneous variants in different currencies never leave a product with mixed currencies', async () => {
    const rounds = 10;
    for (let round = 0; round < rounds; round++) {
      const created = await adminApi(app)
        .post('/api/v1/products')
        .send({ name: `Race ${round}` })
        .expect(201);
      const productId = (created.body as ApiResponse<ProductResponse>).data.id;

      const statuses = await runConcurrently(4, async (i) => {
        const res = await adminApi(app)
          .post(`/api/v1/products/${productId}/variants`)
          .send({
            sku: `R${round}-${i}`,
            name: `V${i}`,
            price_amount: '1.00',
            currency: i % 2 === 0 ? 'USD' : 'VND',
          });
        return res.status;
      });

      const stored = await prisma.productVariant.findMany({
        where: { productId },
      });
      const currencies = new Set(stored.map((v) => v.currency));

      // at least one request wins; every loser is a clean 400, never a 500
      expect(statuses.every((s) => s === 201 || s === 400)).toBe(true);
      expect({ round, distinctCurrencies: currencies.size }).toEqual({
        round,
        distinctCurrencies: 1,
      });
    }
  });
});
