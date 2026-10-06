import {
  DuplicateEntityException,
  InvalidOperationException,
} from '../../../shared/domain/exceptions';
import { Money } from '../../../shared/domain/value-objects/money';
import { Product } from './product.entity';
import { Sku } from './sku';
import { Slug } from './slug';

const variantOf = (
  sku: string,
  price = '10.00',
  currency = 'USD',
): { sku: Sku; name: string; price: Money } => ({
  sku: Sku.create(sku),
  name: sku,
  price: Money.create(price, currency),
});

describe('Product aggregate — DOMAIN-SPEC-1-CATALOG § 1.4 / 1.5', () => {
  const newProduct = (): Product =>
    new Product({ name: 'Tee', slug: Slug.create('tee') });

  describe('addVariant', () => {
    it('creates a variant owned by the product with an exact price', () => {
      const product = newProduct();
      const variant = product.addVariant({
        sku: Sku.create('TEE-M'),
        name: 'M',
        price: Money.create('0.10', 'USD').add(Money.create('0.20', 'USD')),
      });

      expect(variant.productId).toBe(product.id);
      expect(variant.price.amount.toFixed(2)).toBe('0.30');
      expect(variant.price.currency).toBe('USD');
      expect(product.variants).toEqual([variant]);
    });

    it('rejects a duplicate SKU within the same product (R2)', () => {
      const product = newProduct();
      product.addVariant(variantOf('TEE-M'));

      expect(() => product.addVariant(variantOf('TEE-M', '2.00'))).toThrow(
        DuplicateEntityException,
      );
      expect(product.variants).toHaveLength(1);
    });

    it('treats SKUs as case-insensitive (R2): "ts-m" collides with "TS-M"', () => {
      const product = newProduct();
      product.addVariant(variantOf('TS-M'));

      expect(() => product.addVariant(variantOf('ts-m'))).toThrow(
        DuplicateEntityException,
      );
    });

    // Test case 7
    it('rejects a variant in another currency (R4)', () => {
      const product = newProduct();
      product.addVariant(variantOf('TEE-M', '10.00', 'USD'));

      expect(() =>
        product.addVariant(variantOf('TEE-L', '250000', 'VND')),
      ).toThrow(InvalidOperationException);
      expect(product.variants).toHaveLength(1);
    });

    it('accepts any currency for the first variant and then keeps it', () => {
      const product = newProduct();
      product.addVariant(variantOf('A', '1', 'VND'));
      product.addVariant(variantOf('B', '2', 'VND'));
      expect(product.variants.map((v) => v.price.currency)).toEqual([
        'VND',
        'VND',
      ]);
    });

    it('leaves the product unchanged when a variant is rejected', () => {
      const product = newProduct();
      product.addVariant(variantOf('A'));
      const before = product.updatedAt;

      expect(() => product.addVariant(variantOf('A'))).toThrow();
      expect(() => product.addVariant(variantOf('B', '1', 'VND'))).toThrow();

      expect(product.variants).toHaveLength(1);
      expect(product.updatedAt).toBe(before);
    });
  });

  describe('publish / unpublish', () => {
    // Test case 6
    it('refuses to publish a product without variants (R3)', () => {
      const product = newProduct();

      expect(() => product.publish()).toThrow(InvalidOperationException);
      expect(product.isPublished).toBe(false);
    });

    it('publishes once a variant exists and unpublishes back to draft', () => {
      const product = newProduct();
      product.addVariant(variantOf('A'));

      product.publish();
      expect(product.isPublished).toBe(true);

      product.unpublish();
      expect(product.isPublished).toBe(false);
    });

    it('is idempotent and only touches updatedAt on a real change', () => {
      const product = new Product({
        name: 'Tee',
        slug: Slug.create('tee'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      });
      product.addVariant(variantOf('A'));
      product.publish();
      const afterPublish = product.updatedAt;

      product.publish();
      expect(product.updatedAt).toBe(afterPublish);

      product.unpublish();
      const afterUnpublish = product.updatedAt;
      product.unpublish();
      expect(product.updatedAt).toBe(afterUnpublish);
      expect(afterPublish.getTime()).toBeGreaterThan(
        new Date('2026-01-01T00:00:00Z').getTime(),
      );
    });

    it('lets unpublish succeed on a draft without variants', () => {
      expect(() => newProduct().unpublish()).not.toThrow();
    });

    it('can rehydrate an already published product from storage', () => {
      const product = new Product({
        name: 'Tee',
        slug: Slug.create('tee'),
        isPublished: true,
      });
      expect(product.isPublished).toBe(true);
    });
  });
});
