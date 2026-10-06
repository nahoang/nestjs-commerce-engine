import Decimal from 'decimal.js';
import { DuplicateEntityException } from '../../../shared/domain/exceptions';
import { Product } from './product.entity';

describe('Product.addVariant', () => {
  const newProduct = (): Product => new Product({ name: 'Tee', slug: 'tee' });

  it('creates a variant owned by the product with an exact Decimal price', () => {
    const product = newProduct();
    const variant = product.addVariant({
      sku: 'TEE-M',
      name: 'M',
      priceAmount: new Decimal('0.10').plus('0.20'),
    });

    expect(variant.productId).toBe(product.id);
    expect(variant.priceAmount.toFixed(2)).toBe('0.30');
    expect(variant.currency).toBe('USD');
    expect(product.variants).toEqual([variant]);
  });

  it('normalizes the currency to upper case', () => {
    const variant = newProduct().addVariant({
      sku: 'TEE-M',
      name: 'M',
      priceAmount: new Decimal(1),
      currency: 'vnd',
    });
    expect(variant.currency).toBe('VND');
  });

  it('rejects a duplicate SKU within the same product', () => {
    const product = newProduct();
    product.addVariant({
      sku: 'TEE-M',
      name: 'M',
      priceAmount: new Decimal(1),
    });

    expect(() =>
      product.addVariant({
        sku: 'TEE-M',
        name: 'M2',
        priceAmount: new Decimal(2),
      }),
    ).toThrow(DuplicateEntityException);
    expect(product.variants).toHaveLength(1);
  });
});
