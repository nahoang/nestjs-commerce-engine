import { InvalidValueException } from '../../../shared/domain/exceptions';
import { Slug } from './slug';

describe('Slug.fromName (API-CONVENTIONS §6)', () => {
  // Test case 3
  it('converts "Đồ Nam" to "do-nam"', () => {
    expect(Slug.fromName('Đồ Nam').value).toBe('do-nam');
  });

  it('converts Vietnamese text "Thời trang" to "thoi-trang"', () => {
    expect(Slug.fromName('Thời trang').value).toBe('thoi-trang');
  });

  it('handles punctuation and collapses dashes/spaces in "Men\'s  Shoes -- 2024"', () => {
    expect(Slug.fromName("Men's  Shoes -- 2024").value).toBe('mens-shoes-2024');
  });

  it('returns 8 random hex characters when the input has nothing usable ("!!!", "")', () => {
    expect(Slug.fromName('!!!').value).toMatch(/^[0-9a-f]{8}$/);
    expect(Slug.fromName('').value).toMatch(/^[0-9a-f]{8}$/);
  });

  it('handles complex Vietnamese text with accents and tones', () => {
    expect(Slug.fromName('Áo Thun Cotton Cổ Tròn - Hè 2025').value).toBe(
      'ao-thun-cotton-co-tron-he-2025',
    );
  });

  it.each([
    ['snake_case_name', 'snake-case-name'],
    ['  -- Sale --  ', 'sale'],
    ['- a', 'a'],
    ['a__b', 'a-b'],
  ])(
    'always returns a valid Slug: %p -> %p (§6 output outside the invariant is repaired)',
    (name, expected) => {
      expect(Slug.fromName(name).value).toBe(expected);
    },
  );

  it('keeps the result within 255 characters without a trailing hyphen', () => {
    const slug = Slug.fromName(`${'a'.repeat(254)} b`);
    expect(slug.value.length).toBeLessThanOrEqual(255);
    expect(slug.value).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });
});

describe('Slug.create', () => {
  it.each(['do-nam', 'ao-thun-2025', 'a', '123'])('accepts %p', (value) => {
    expect(Slug.create(value).value).toBe(value);
  });

  // Test case 3
  it('rejects "Ao Thun" instead of correcting it', () => {
    expect(() => Slug.create('Ao Thun')).toThrow(InvalidValueException);
  });

  it.each([
    '',
    'Ao-thun',
    'ao thun',
    'ao--thun',
    '-ao',
    'ao-',
    'ao_thun',
    'áo',
    'a'.repeat(256),
  ])('rejects %p', (value) => {
    expect(() => Slug.create(value)).toThrow(InvalidValueException);
  });

  it('accepts exactly 255 characters', () => {
    expect(Slug.create('a'.repeat(255)).value).toHaveLength(255);
  });

  it('carries the field name for the API error', () => {
    expect.assertions(1);
    try {
      Slug.create('Bad Slug');
    } catch (error) {
      expect((error as InvalidValueException).field).toBe('slug');
    }
  });

  it('compares by value', () => {
    expect(Slug.create('a-b').equals(Slug.create('a-b'))).toBe(true);
    expect(Slug.create('a-b').equals(Slug.create('a-c'))).toBe(false);
    expect(Slug.create('a-b').equals(null)).toBe(false);
  });
});
