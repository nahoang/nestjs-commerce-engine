import { slugify } from './slugify';

describe('slugify (API-CONVENTIONS §6)', () => {
  it('converts Vietnamese text "Thời trang" to "thoi-trang"', () => {
    expect(slugify('Thời trang')).toBe('thoi-trang');
  });

  it('converts Vietnamese letter Đ in "Đồ Nam" to "do-nam"', () => {
    expect(slugify('Đồ Nam')).toBe('do-nam');
  });

  it('handles punctuation and collapses multiple dashes/spaces in "Men\'s  Shoes -- 2024" to "mens-shoes-2024"', () => {
    expect(slugify("Men's  Shoes -- 2024")).toBe('mens-shoes-2024');
  });

  it('returns an 8-character random hex string when input contains only special characters ("!!!")', () => {
    const result = slugify('!!!');
    expect(result).toMatch(/^[0-9a-f]{8}$/);
  });

  it('returns an 8-character random hex string when input is empty', () => {
    const result = slugify('');
    expect(result).toMatch(/^[0-9a-f]{8}$/);
  });

  it('correctly handles complex Vietnamese text with accents and tones', () => {
    expect(slugify('Áo Thun Cotton Cổ Tròn - Hè 2025')).toBe(
      'ao-thun-cotton-co-tron-he-2025',
    );
  });
});
