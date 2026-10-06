import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { VariantInput } from './variant-input';

function errorsFor(payload: Record<string, unknown>): string[] {
  const instance = plainToInstance(VariantInput, payload);
  return validateSync(instance).map((e) => e.property);
}

const valid = { sku: 'A-1', name: 'A', price_amount: '10.50' };

describe('VariantInput validation', () => {
  it.each(['0', '0.00', '10', '10.5', '250000.00', '9999999999.99'])(
    'accepts price_amount %p',
    (price) => {
      expect(errorsFor({ ...valid, price_amount: price })).toEqual([]);
    },
  );

  it.each(['-1', '1.234', '.5', '1e3', '+1', 'abc', '', '12345678901'])(
    'rejects price_amount %p',
    (price) => {
      expect(errorsFor({ ...valid, price_amount: price })).toEqual([
        'price_amount',
      ]);
    },
  );

  it('accepts a JSON number by stringifying it, and rejects non-decimal numbers', () => {
    expect(errorsFor({ ...valid, price_amount: 19.9 })).toEqual([]);
    expect(errorsFor({ ...valid, price_amount: -1 })).toEqual(['price_amount']);
    expect(errorsFor({ ...valid, price_amount: 1e21 })).toEqual([
      'price_amount',
    ]);
    expect(errorsFor({ ...valid, price_amount: true })).toEqual([
      'price_amount',
    ]);
  });

  it('accepts any-case 3-letter currency (Money normalizes it) and rejects invalid codes', () => {
    expect(errorsFor({ ...valid, currency: 'vnd' })).toEqual([]);
    expect(errorsFor({ ...valid, currency: 'VND' })).toEqual([]);
    expect(errorsFor({ ...valid, currency: 'us' })).toEqual(['currency']);
    expect(errorsFor({ ...valid, currency: 'USDX' })).toEqual(['currency']);
    expect(errorsFor({ ...valid, currency: 5 })).toEqual(['currency']);
  });

  it.each(['ts-m', 'TS-M', '  ts_m_01  ', 'A'])(
    'accepts sku %p (case-insensitive)',
    (sku) => {
      expect(errorsFor({ ...valid, sku })).toEqual([]);
    },
  );

  it.each(['', 'ts m', '-ts', 'a/b', 'A'.repeat(101), 7])(
    'rejects sku %p with the property name as field',
    (sku) => {
      expect(errorsFor({ ...valid, sku })).toEqual(['sku']);
    },
  );
});
