import { InvalidValueException } from '../../../shared/domain/exceptions';
import { Sku } from './sku';

describe('Sku', () => {
  it('trims and upper-cases the value', () => {
    expect(Sku.create('  ts-m ').value).toBe('TS-M');
  });

  it('treats SKUs that differ only by case as equal (R2)', () => {
    expect(Sku.create('ts-m').equals(Sku.create('TS-M'))).toBe(true);
    expect(Sku.create('ts-m').equals(Sku.create('TS-L'))).toBe(false);
    expect(Sku.create('ts-m').equals(null)).toBe(false);
  });

  it.each(['A', '9', 'TS-M', 'TS_M_01', 'A'.repeat(100)])('accepts %p', (v) => {
    expect(Sku.create(v).value).toBe(v);
  });

  it.each([
    '',
    '   ',
    '-TS',
    '_TS',
    'TS M',
    'TS.M',
    'TS/M',
    'Á1',
    'A'.repeat(101),
  ])('rejects %p', (v) => {
    expect(() => Sku.create(v)).toThrow(InvalidValueException);
  });

  it('carries the given field name (nested payload paths)', () => {
    expect.assertions(1);
    try {
      Sku.create('bad sku', 'variants.2.sku');
    } catch (error) {
      expect((error as InvalidValueException).field).toBe('variants.2.sku');
    }
  });
});
