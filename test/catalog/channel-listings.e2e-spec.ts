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
import { ListingResponse } from '../../src/modules/catalog/api/listing.response';

describe('Channel listings & storefront (e2e) — DOMAIN-SPEC-1-CATALOG § 1.8', () => {
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

  async function createChannel(slug: string, currency: string): Promise<void> {
    await request(server())
      .post('/api/v1/channels')
      .send({ name: slug, slug, currency })
      .expect(201);
  }

  /** Creates a product (published when asked) with variants; returns product and variant ids. */
  async function createProduct(
    name: string,
    options: { published?: boolean; variants?: number } = {},
  ): Promise<{ productId: string; variantIds: string[] }> {
    const count = options.variants ?? 1;
    const res = await request(server())
      .post('/api/v1/products')
      .send({
        name,
        is_published: options.published ?? true,
        variants: Array.from({ length: count }, (_, i) => ({
          sku: `${name.replace(/\W/g, '').toUpperCase()}-${i}`,
          name: `V${i}`,
          price_amount: '999.00',
          currency: 'USD',
        })),
      })
      .expect(201);
    const product = (res.body as ApiResponse<ProductResponse>).data;
    return {
      productId: product.id,
      variantIds: product.variants.map((v) => v.id),
    };
  }

  const list = (
    channel: string,
    variantId: string,
    body: Record<string, unknown>,
  ): request.Test =>
    request(server())
      .post(`/api/v1/channels/${channel}/listings`)
      .send({ variant_id: variantId, ...body });

  const storefront = async (
    channel: string,
    query = '',
  ): Promise<PaginatedResponse<ProductResponse>> => {
    const res = await request(server())
      .get(`/api/v1/channels/${channel}/products${query}`)
      .expect(200);
    return res.body as PaginatedResponse<ProductResponse>;
  };

  it('1. a variant is priced per channel: 250000 VND on vn-store, 12 USD on us-store', async () => {
    await createChannel('vn-store', 'VND');
    await createChannel('us-store', 'USD');
    const { variantIds } = await createProduct('Ao Thun Basic');

    const created = await list('vn-store', variantIds[0], {
      price_amount: '250000',
    }).expect(201);
    const listing = (created.body as ApiResponse<ListingResponse>).data;
    expect(listing).toMatchObject({
      variant_id: variantIds[0],
      price_amount: '250000.00',
      currency: 'VND',
      is_available: true,
    });
    await list('us-store', variantIds[0], { price_amount: '12' }).expect(201);

    const vn = await storefront('vn-store');
    expect(vn.total).toBe(1);
    expect(vn.data[0].variants).toHaveLength(1);
    expect(vn.data[0].variants[0]).toMatchObject({
      price_amount: '250000.00',
      currency: 'VND',
    });

    const us = await storefront('us-store');
    expect(us.data[0].variants[0]).toMatchObject({
      price_amount: '12.00',
      currency: 'USD',
    });
  });

  it('1b. R2: a client-sent currency is ignored, the channel currency is used and stored nowhere', async () => {
    await createChannel('vn-store', 'VND');
    const { variantIds } = await createProduct('Ao');
    const res = await list('vn-store', variantIds[0], {
      price_amount: '1',
      currency: 'EUR',
    }).expect(201);
    expect((res.body as ApiResponse<ListingResponse>).data.currency).toBe(
      'VND',
    );
    const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'product_variant_channel_listings'`;
    expect(columns.map((c) => c.column_name)).not.toContain('currency');
  });

  it('2. R1: a second listing for the same (variant, channel) -> 409', async () => {
    await createChannel('vn-store', 'VND');
    const { variantIds } = await createProduct('Ao');
    await list('vn-store', variantIds[0], { price_amount: '1' }).expect(201);
    const res = await list('vn-store', variantIds[0], {
      price_amount: '2',
    }).expect(409);
    expect((res.body as ErrorResponse).error_code).toBe('DUPLICATE_ENTITY');
    expect(await prisma.productVariantChannelListing.count()).toBe(1);
  });

  it('3. R4: a draft product with a listing is not on the storefront', async () => {
    await createChannel('vn-store', 'VND');
    const { variantIds } = await createProduct('Draft', { published: false });
    await list('vn-store', variantIds[0], { price_amount: '1' }).expect(201);
    expect((await storefront('vn-store')).total).toBe(0);
  });

  it('4. R4/R5: unavailable variants are hidden; a product with none left is hidden', async () => {
    await createChannel('vn-store', 'VND');
    const { variantIds } = await createProduct('Ao', { variants: 2 });
    await list('vn-store', variantIds[0], { price_amount: '10' }).expect(201);
    await list('vn-store', variantIds[1], {
      price_amount: '20',
      is_available: false,
    }).expect(201);

    const page = await storefront('vn-store');
    expect(page.data).toHaveLength(1);
    expect(page.data[0].variants.map((v) => v.id)).toEqual([variantIds[0]]);

    const other = await createProduct('Only Hidden');
    await list('vn-store', other.variantIds[0], {
      price_amount: '5',
      is_available: false,
    }).expect(201);
    expect((await storefront('vn-store')).total).toBe(1);

    // an unlisted variant never shows, and its base price (999 USD) never leaks
    const flat = JSON.stringify(await storefront('vn-store'));
    expect(flat).not.toContain('999');
  });

  it('5. R6: switching a channel off -> its storefront is 404; unknown channel -> 404', async () => {
    await createChannel('us-store', 'USD');
    const { variantIds } = await createProduct('Ao');
    await list('us-store', variantIds[0], { price_amount: '12' }).expect(201);
    expect((await storefront('us-store')).total).toBe(1);

    await request(server())
      .patch('/api/v1/channels/us-store')
      .send({ is_active: false })
      .expect(200);
    const res = await request(server())
      .get('/api/v1/channels/us-store/products')
      .expect(404);
    expect((res.body as ErrorResponse).error_code).toBe('ENTITY_NOT_FOUND');
    await request(server()).get('/api/v1/channels/nope/products').expect(404);
    // the listing endpoint keeps working for a switched-off channel (1.7 R4)
    await list('us-store', variantIds[0], { price_amount: '1' }).expect(409);

    await request(server())
      .patch('/api/v1/channels/us-store')
      .send({ is_active: true })
      .expect(200);
    expect((await storefront('us-store')).total).toBe(1);
  });

  it('6. R8: cached storefront reflects the next change immediately', async () => {
    await createChannel('vn-store', 'VND');
    const { productId, variantIds } = await createProduct('Ao', {
      published: false,
      variants: 2,
    });
    await list('vn-store', variantIds[0], { price_amount: '10' }).expect(201);

    // warm the cache with the empty storefront (draft product)
    expect((await storefront('vn-store')).total).toBe(0);

    // publish -> visible right away
    await request(server())
      .post(`/api/v1/products/${productId}/publish`)
      .expect(200);
    const afterPublish = await storefront('vn-store');
    expect(afterPublish.total).toBe(1);
    expect(afterPublish.data[0].variants).toHaveLength(1);

    // new listing -> visible right away on the (now cached) page
    await list('vn-store', variantIds[1], { price_amount: '20' }).expect(201);
    expect((await storefront('vn-store')).data[0].variants).toHaveLength(2);

    // unpublish -> gone right away
    await request(server())
      .post(`/api/v1/products/${productId}/unpublish`)
      .expect(200);
    expect((await storefront('vn-store')).total).toBe(0);

    // switch off -> 404 right away
    await request(server())
      .patch('/api/v1/channels/vn-store')
      .send({ is_active: false })
      .expect(200);
    await request(server())
      .get('/api/v1/channels/vn-store/products')
      .expect(404);
  });

  it('6b. repeated storefront requests are served from the cache (no product queries)', async () => {
    await createChannel('vn-store', 'VND');
    const { variantIds } = await createProduct('Ao');
    await list('vn-store', variantIds[0], { price_amount: '10' }).expect(201);

    const count = async (): Promise<number> => {
      let counting = true;
      let queries = 0;
      prisma.$on('query', () => {
        if (counting) queries++;
      });
      try {
        await storefront('vn-store');
      } finally {
        counting = false;
      }
      return queries;
    };

    const cold = await count();
    const warm = await count();
    expect(warm).toBeLessThan(cold);
    // only the channel lookup remains: it is never cached (R6)
    expect(warm).toBe(1);
  });

  it('7. query count does not depend on the number of products', async () => {
    await createChannel('vn-store', 'VND');
    const seed = async (from: number, to: number): Promise<void> => {
      for (let i = from; i < to; i++) {
        const { variantIds } = await createProduct(`Prod ${i}`, {
          variants: 3,
        });
        for (const variantId of variantIds) {
          await list('vn-store', variantId, { price_amount: '1' }).expect(201);
        }
      }
    };
    const countFor = async (limit: number): Promise<number> => {
      let counting = true;
      let queries = 0;
      prisma.$on('query', () => {
        if (counting) queries++;
      });
      try {
        const page = await storefront('vn-store', `?limit=${limit}`);
        expect(page.data).toHaveLength(limit);
      } finally {
        counting = false;
      }
      return queries;
    };

    await seed(0, 5);
    const five = await countFor(5);
    await seed(5, 12);
    const twelve = await countFor(12);
    expect(twelve).toBe(five);
    expect(five).toBeLessThan(10);
  });

  it('8. R7: deleting a variant or a channel deletes its listings', async () => {
    await createChannel('vn-store', 'VND');
    await createChannel('us-store', 'USD');
    const { variantIds } = await createProduct('Ao', { variants: 2 });
    await list('vn-store', variantIds[0], { price_amount: '1' }).expect(201);
    await list('us-store', variantIds[0], { price_amount: '1' }).expect(201);
    await list('vn-store', variantIds[1], { price_amount: '1' }).expect(201);

    await prisma.productVariant.delete({ where: { id: variantIds[1] } });
    expect(await prisma.productVariantChannelListing.count()).toBe(2);
    await prisma.channel.delete({ where: { slug: 'us-store' } });
    expect(await prisma.productVariantChannelListing.count()).toBe(1);
  });

  it.each([
    [{ price_amount: '-1' }, 'price_amount'],
    [{ price_amount: '1.234' }, 'price_amount'],
    [{ price_amount: 'abc' }, 'price_amount'],
    [{}, 'price_amount'],
    [{ price_amount: '1', is_available: 'yes' }, 'is_available'],
  ])(
    '9. invalid payload %j -> 422 on %s and nothing is stored',
    async (body, field) => {
      await createChannel('vn-store', 'VND');
      const { variantIds } = await createProduct('Ao');
      const res = await list('vn-store', variantIds[0], body).expect(422);
      expect((res.body as ErrorResponse).errors?.map((e) => e.field)).toContain(
        field,
      );
      expect(await prisma.productVariantChannelListing.count()).toBe(0);
    },
  );

  it('10. unknown channel or variant -> 404', async () => {
    await createChannel('vn-store', 'VND');
    const { variantIds } = await createProduct('Ao');
    await list('nope', variantIds[0], { price_amount: '1' }).expect(404);
    await list('vn-store', '00000000-0000-0000-0000-000000000000', {
      price_amount: '1',
    }).expect(404);
  });

  it('11. storefront pagination: total counts all matches, pages are slices', async () => {
    await createChannel('vn-store', 'VND');
    for (let i = 0; i < 3; i++) {
      const { variantIds } = await createProduct(`P${i}`);
      await list('vn-store', variantIds[0], { price_amount: '1' }).expect(201);
    }
    const first = await storefront('vn-store', '?limit=2&offset=0');
    const second = await storefront('vn-store', '?limit=2&offset=2');
    expect(first.total).toBe(3);
    expect(first.data).toHaveLength(2);
    expect(first.has_next).toBe(true);
    expect(second.data).toHaveLength(1);
    expect(second.has_next).toBe(false);
    const ids = [...first.data, ...second.data].map((p) => p.id);
    expect(new Set(ids).size).toBe(3);
  });
});
