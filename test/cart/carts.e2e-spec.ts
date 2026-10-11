import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from '../helpers/test-app';
import { truncateAll } from '../helpers/db';
import { adminApi, createUserToken, resetWithAdmin } from '../helpers/auth';
import { PrismaService } from '../../src/shared/infrastructure/prisma/prisma.service';
import { ApiResponse, ErrorResponse } from '../../src/shared/api/envelope';
import { ProductResponse } from '../../src/modules/catalog/api/product.response';
import { CartResponse } from '../../src/modules/cart/api/cart.response';

describe('Carts (e2e) — DOMAIN-SPEC-3-CART § 3.2', () => {
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

  const anon = (): ReturnType<typeof request.agent> =>
    request.agent(app.getHttpServer() as never);

  async function createChannel(slug: string, currency: string): Promise<void> {
    await adminApi(app)
      .post('/api/v1/channels')
      .send({ name: slug, slug, currency })
      .expect(201);
  }

  async function createProduct(
    name: string,
    options: { published?: boolean; variants?: number } = {},
  ): Promise<string[]> {
    const count = options.variants ?? 1;
    const res = await adminApi(app)
      .post('/api/v1/products')
      .send({
        name,
        is_published: options.published ?? true,
        variants: Array.from({ length: count }, (_, i) => ({
          sku: `${name.replace(/\W/g, '').toUpperCase()}-${i}`,
          name: `V${i}`,
          price_amount: '999.00', // base price: must never reach the cart
          currency: 'USD',
        })),
      })
      .expect(201);
    return (res.body as ApiResponse<ProductResponse>).data.variants.map(
      (v) => v.id,
    );
  }

  async function listVariant(
    channel: string,
    variantId: string,
    price: string,
  ): Promise<void> {
    await adminApi(app)
      .post(`/api/v1/channels/${channel}/listings`)
      .send({ variant_id: variantId, price_amount: price })
      .expect(201);
  }

  async function newCart(channel = 'vn-store'): Promise<CartResponse> {
    const res = await anon()
      .post('/api/v1/carts')
      .send({ channel_slug: channel })
      .expect(201);
    return (res.body as ApiResponse<CartResponse>).data;
  }

  const addLine = (
    token: string,
    variantId: string,
    quantity: number,
  ): request.Test =>
    anon()
      .post(`/api/v1/carts/${token}/lines`)
      .send({ variant_id: variantId, quantity });

  const cartOf = (res: request.Response): CartResponse =>
    (res.body as ApiResponse<CartResponse>).data;

  it('1. creates a cart on vn-store: currency VND, no lines, token >= 128 bits', async () => {
    await createChannel('vn-store', 'VND');
    const cart = await newCart();
    expect(cart).toMatchObject({
      channel_slug: 'vn-store',
      currency: 'VND',
      status: 'ACTIVE',
      lines: [],
      subtotal_amount: '0.00',
      voucher_code: null,
      discount_amount: '0.00',
      total_amount: '0.00',
    });
    expect(cart.token).toMatch(/^[0-9a-f]{64}$/);
    expect((await prisma.cart.findFirstOrThrow()).userId).toBeNull();
  });

  it('1b. R1: unknown or switched-off channel -> 404; missing channel_slug -> 422', async () => {
    await createChannel('vn-store', 'VND');
    await anon()
      .post('/api/v1/carts')
      .send({ channel_slug: 'nope' })
      .expect(404);
    await adminApi(app)
      .patch('/api/v1/channels/vn-store')
      .send({ is_active: false })
      .expect(200);
    await anon()
      .post('/api/v1/carts')
      .send({ channel_slug: 'vn-store' })
      .expect(404);
    const res = await anon().post('/api/v1/carts').send({}).expect(422);
    expect((res.body as ErrorResponse).errors?.map((e) => e.field)).toContain(
      'channel_slug',
    );
    expect(await prisma.cart.count()).toBe(0);
  });

  it('1c. R2: a Bearer token attaches user_id; an invalid one is rejected', async () => {
    await createChannel('vn-store', 'VND');
    const token = await createUserToken(app, prisma, 'customer', 'c@e.com');
    await anon()
      .post('/api/v1/carts')
      .set('Authorization', `Bearer ${token}`)
      .send({ channel_slug: 'vn-store' })
      .expect(201);
    expect((await prisma.cart.findFirstOrThrow()).userId).not.toBeNull();
    await anon()
      .post('/api/v1/carts')
      .set('Authorization', 'Bearer garbage')
      .send({ channel_slug: 'vn-store' })
      .expect(401);
  });

  it('2. adds two variants, GET shows the subtotal at CHANNEL prices (not the 999 base price)', async () => {
    await createChannel('vn-store', 'VND');
    const [v0, v1] = await createProduct('Ao', { variants: 2 });
    await listVariant('vn-store', v0, '200000');
    await listVariant('vn-store', v1, '150000.50');
    const { token } = await newCart();

    await addLine(token, v0, 2).expect(200);
    await addLine(token, v1, 1).expect(200);
    const res = await anon().get(`/api/v1/carts/${token}`).expect(200);
    const cart = cartOf(res);
    expect(cart.lines).toHaveLength(2);
    expect(cart.subtotal_amount).toBe('550000.50');
    expect(cart.total_amount).toBe('550000.50');
    expect(cart.lines.find((l) => l.variant_id === v0)).toMatchObject({
      sku: 'AO-0',
      product_name: 'Ao',
      variant_name: 'V0',
      quantity: 2,
      unit_price_amount: '200000.00',
      line_total_amount: '400000.00',
      is_available: true,
      reserved_until: null,
    });
    expect(JSON.stringify(res.body)).not.toContain('999');
  });

  it('2b. R1 (3.1): adding the same variant again merges into one line', async () => {
    await createChannel('vn-store', 'VND');
    const [v0] = await createProduct('Ao');
    await listVariant('vn-store', v0, '100');
    const { token } = await newCart();
    await addLine(token, v0, 2).expect(200);
    const cart = cartOf(await addLine(token, v0, 1).expect(200));
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0].quantity).toBe(3);
    expect(await prisma.cartLine.count()).toBe(1);
  });

  it('3. PATCH updates the quantity and the subtotal; DELETE removes the line', async () => {
    await createChannel('vn-store', 'VND');
    const [v0, v1] = await createProduct('Ao', { variants: 2 });
    await listVariant('vn-store', v0, '100');
    await listVariant('vn-store', v1, '50');
    const { token } = await newCart();
    await addLine(token, v0, 2).expect(200);
    const two = cartOf(await addLine(token, v1, 1).expect(200));
    const lineId = two.lines.find((l) => l.variant_id === v0)!.id;

    const patched = cartOf(
      await anon()
        .patch(`/api/v1/carts/${token}/lines/${lineId}`)
        .send({ quantity: 5 })
        .expect(200),
    );
    expect(patched.subtotal_amount).toBe('550.00');

    const removed = cartOf(
      await anon().delete(`/api/v1/carts/${token}/lines/${lineId}`).expect(200),
    );
    expect(removed.lines.map((l) => l.variant_id)).toEqual([v1]);
    expect(removed.subtotal_amount).toBe('50.00');

    // 3.1 R3: the line is gone -> 404
    await anon().delete(`/api/v1/carts/${token}/lines/${lineId}`).expect(404);
    await anon()
      .patch(`/api/v1/carts/${token}/lines/${lineId}`)
      .send({ quantity: 1 })
      .expect(404);
  });

  it('3b. quantity rules: > max -> 400 INVALID_OPERATION and the cart is unchanged; 0 or 1.5 -> 422', async () => {
    await createChannel('vn-store', 'VND');
    const [v0] = await createProduct('Ao');
    await listVariant('vn-store', v0, '100');
    const { token } = await newCart();
    const cart = cartOf(await addLine(token, v0, 3).expect(200));

    const tooMany = await addLine(token, v0, 49).expect(400);
    expect((tooMany.body as ErrorResponse).error_code).toBe(
      'INVALID_OPERATION',
    );
    const after = cartOf(
      await anon().get(`/api/v1/carts/${token}`).expect(200),
    );
    expect(after.lines[0].quantity).toBe(3);

    await anon()
      .patch(`/api/v1/carts/${token}/lines/${cart.lines[0].id}`)
      .send({ quantity: 51 })
      .expect(400);
    await addLine(token, v0, 0).expect(422);
    await addLine(token, v0, 1.5).expect(422);
  });

  it('4. a variant with no listing on the channel -> 400; a draft product -> 400; unknown variant -> 404', async () => {
    await createChannel('vn-store', 'VND');
    const [unlisted] = await createProduct('Unlisted');
    const [draft] = await createProduct('Draft', { published: false });
    await listVariant('vn-store', draft, '100');
    const { token } = await newCart();

    for (const variantId of [unlisted, draft]) {
      const res = await addLine(token, variantId, 1).expect(400);
      expect((res.body as ErrorResponse).error_code).toBe('INVALID_OPERATION');
    }
    await addLine(token, '00000000-0000-0000-0000-000000000000', 1).expect(404);
    expect(await prisma.cartLine.count()).toBe(0);
  });

  it('4b. a listing on ANOTHER channel does not count; is_available=false does not count', async () => {
    await createChannel('vn-store', 'VND');
    await createChannel('us-store', 'USD');
    const [v0, v1] = await createProduct('Ao', { variants: 2 });
    await listVariant('us-store', v0, '12');
    await adminApi(app)
      .post('/api/v1/channels/vn-store/listings')
      .send({ variant_id: v1, price_amount: '10', is_available: false })
      .expect(201);
    const { token } = await newCart('vn-store');
    await addLine(token, v0, 1).expect(400);
    await addLine(token, v1, 1).expect(400);
  });

  it('5. an admin price change shows in the very next GET; a withdrawn listing makes the line unavailable', async () => {
    await createChannel('vn-store', 'VND');
    const [v0, v1] = await createProduct('Ao', { variants: 2 });
    await listVariant('vn-store', v0, '100');
    await listVariant('vn-store', v1, '30');
    const { token } = await newCart();
    await addLine(token, v0, 2).expect(200);
    await addLine(token, v1, 1).expect(200);
    expect(
      cartOf(await anon().get(`/api/v1/carts/${token}`).expect(200))
        .subtotal_amount,
    ).toBe('230.00');

    // no price is stored on the cart: only the listing changes
    await prisma.productVariantChannelListing.updateMany({
      where: { variantId: v0 },
      data: { priceAmount: '250' },
    });
    expect(
      cartOf(await anon().get(`/api/v1/carts/${token}`).expect(200))
        .subtotal_amount,
    ).toBe('530.00');

    await prisma.productVariantChannelListing.updateMany({
      where: { variantId: v1 },
      data: { isAvailable: false },
    });
    const cart = cartOf(await anon().get(`/api/v1/carts/${token}`).expect(200));
    expect(cart.subtotal_amount).toBe('500.00');
    expect(cart.lines.find((l) => l.variant_id === v1)).toMatchObject({
      is_available: false,
      unit_price_amount: null,
      line_total_amount: null,
    });
  });

  it('6. unknown cart token -> 404 on every route', async () => {
    await createChannel('vn-store', 'VND');
    const [v0] = await createProduct('Ao');
    await listVariant('vn-store', v0, '1');
    await anon().get('/api/v1/carts/nope').expect(404);
    await addLine('nope', v0, 1).expect(404);
    await anon()
      .patch('/api/v1/carts/nope/lines/x')
      .send({ quantity: 1 })
      .expect(404);
    await anon().delete('/api/v1/carts/nope/lines/x').expect(404);
  });

  it('7. an ORDERED cart rejects every change with 400; reading still works', async () => {
    await createChannel('vn-store', 'VND');
    const [v0] = await createProduct('Ao');
    await listVariant('vn-store', v0, '100');
    const { token } = await newCart();
    const cart = cartOf(await addLine(token, v0, 1).expect(200));
    await prisma.cart.update({ where: { token }, data: { status: 'ORDERED' } });

    await addLine(token, v0, 1).expect(400);
    await anon()
      .patch(`/api/v1/carts/${token}/lines/${cart.lines[0].id}`)
      .send({ quantity: 2 })
      .expect(400);
    await anon()
      .delete(`/api/v1/carts/${token}/lines/${cart.lines[0].id}`)
      .expect(400);
    expect(
      cartOf(await anon().get(`/api/v1/carts/${token}`).expect(200)).status,
    ).toBe('ORDERED');
  });

  it('8. concurrent adds of the same variant to one cart are serialized: one line, summed quantity', async () => {
    await createChannel('vn-store', 'VND');
    const [v0] = await createProduct('Ao');
    await listVariant('vn-store', v0, '10');
    const { token } = await newCart();
    const results = await Promise.all(
      Array.from({ length: 5 }, () => addLine(token, v0, 2)),
    );
    expect(results.map((r) => r.status)).toEqual([200, 200, 200, 200, 200]);
    const cart = cartOf(await anon().get(`/api/v1/carts/${token}`).expect(200));
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0].quantity).toBe(10);
  });

  it('9. R7: deleting the variant removes its lines; the CHECK constraints hold in the database', async () => {
    await createChannel('vn-store', 'VND');
    const [v0, v1] = await createProduct('Ao', { variants: 2 });
    await listVariant('vn-store', v0, '1');
    await listVariant('vn-store', v1, '1');
    const { token } = await newCart();
    await addLine(token, v0, 1).expect(200);
    await addLine(token, v1, 1).expect(200);
    await prisma.productVariant.delete({ where: { id: v1 } });
    expect(await prisma.cartLine.count()).toBe(1);

    const line = await prisma.cartLine.findFirstOrThrow();
    await expect(
      prisma.cartLine.update({ where: { id: line.id }, data: { quantity: 0 } }),
    ).rejects.toThrow();
    await expect(
      prisma.cart.update({ where: { token }, data: { status: 'WEIRD' } }),
    ).rejects.toThrow();
  });
});
