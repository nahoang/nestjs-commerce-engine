import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { formatValidationErrors } from '../../../app.setup';
import { CreateCategoryRequest } from './create-category.request';
import { CreateProductRequest } from './create-product.request';

function fieldsFor<T extends object>(
  type: new () => T,
  payload: Record<string, unknown>,
): string[] {
  const errors = validateSync(plainToInstance(type, payload));
  return formatValidationErrors(errors).map((e) => e.field);
}

describe('slug validation on create requests (R1, value object backed)', () => {
  it.each([CreateProductRequest, CreateCategoryRequest])(
    '%p accepts a valid slug, a missing slug and a blank slug (auto-generated)',
    (type) => {
      expect(fieldsFor(type, { name: 'A', slug: 'ao-thun' })).toEqual([]);
      expect(fieldsFor(type, { name: 'A' })).toEqual([]);
      expect(fieldsFor(type, { name: 'A', slug: '   ' })).toEqual([]);
    },
  );

  it.each([CreateProductRequest, CreateCategoryRequest])(
    '%p rejects "Ao Thun" on field slug',
    (type) => {
      expect(fieldsFor(type, { name: 'A', slug: 'Ao Thun' })).toEqual(['slug']);
      expect(fieldsFor(type, { name: 'A', slug: 'ao--thun' })).toEqual([
        'slug',
      ]);
      expect(fieldsFor(type, { name: 'A', slug: 42 })).toEqual(['slug']);
    },
  );

  it('reports nested variant problems with the full path', () => {
    const fields = fieldsFor(CreateProductRequest, {
      name: 'A',
      variants: [
        { sku: 'OK-1', name: 'A', price_amount: '1' },
        { sku: 'bad sku', name: 'B', price_amount: '-1', currency: 'us' },
      ],
    });

    expect(fields.sort()).toEqual([
      'variants.1.currency',
      'variants.1.price_amount',
      'variants.1.sku',
    ]);
  });
});
