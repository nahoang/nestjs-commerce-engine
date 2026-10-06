import { randomBytes } from 'node:crypto';

/**
 * Generates a clean, URL-friendly slug from a text string according to API-CONVENTIONS §6.
 *
 * Algorithm:
 * 1. Replace đ → d, Đ → D.
 * 2. Normalize to Unicode NFKD and strip combining marks (removes Vietnamese diacritics).
 * 3. Drop every character that is not a letter, digit, underscore, whitespace or hyphen; trim; lowercase.
 * 4. Collapse runs of whitespace and hyphens into a single '-'.
 * 5. If the result is empty → 8 random hex characters.
 */
export function slugify(name: string): string {
  // 1. Replace đ → d, Đ → D
  let text = name.replace(/đ/g, 'd').replace(/Đ/g, 'D');

  // 2. Normalize to Unicode NFKD and strip combining marks (removes Vietnamese diacritics)
  text = text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');

  // 3. Drop every character that is not a letter, digit, underscore, whitespace or hyphen; trim; lowercase
  text = text
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase();

  // 4. Collapse runs of whitespace and hyphens into a single '-'
  const slug = text.replace(/[-\s]+/g, '-');

  // 5. If the result is empty → 8 random hex characters
  return slug || randomBytes(4).toString('hex');
}
