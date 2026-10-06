import { INestApplication } from '@nestjs/common';
import { Server } from 'http';
import * as request from 'supertest';
import { createTestApp } from '../helpers/test-app';
import { truncateAll } from '../helpers/db';
import { runConcurrently } from '../helpers/concurrency';
import { PrismaService } from '../../src/shared/infrastructure/prisma/prisma.service';
import { ApiResponse } from '../../src/shared/api/envelope';
import { ProductResponse } from '../../src/modules/catalog/api/product.response';

describe('Channel listing uniqueness under concurrency (e2e) — DOMAIN-SPEC-1-CATALOG § 1.8 R1', () => {
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

  it('exactly one of N simultaneous listings of the same (variant, channel) wins; the others get 409', async () => {
    await request(server())
      .post('/api/v1/channels')
      .send({ name: 'VN', slug: 'vn-race', currency: 'VND' })
      .expect(201);
    const created = await request(server())
      .post('/api/v1/products')
      .send({
        name: 'Race',
        variants: [
          { sku: 'RACE-L', name: 'M', price_amount: '1', currency: 'USD' },
        ],
      })
      .expect(201);
    const variantId = (created.body as ApiResponse<ProductResponse>).data
      .variants[0].id;

    const statuses = await runConcurrently(8, async (i) => {
      const res = await request(server())
        .post('/api/v1/channels/vn-race/listings')
        .send({ variant_id: variantId, price_amount: `${i + 1}` });
      return res.status;
    });

    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(7);
    expect(await prisma.productVariantChannelListing.count()).toBe(1);
  });
});
