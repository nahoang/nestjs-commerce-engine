import { randomBytes } from 'node:crypto';
import { InvalidValueException } from '../../../shared/domain/exceptions';

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_LENGTH = 255;

/**
 * URL-friendly identifier. Immutable, compared by value, valid by construction:
 * lower-case letters and digits separated by single hyphens, at most 255 characters.
 */
export class Slug {
  private constructor(readonly value: string) {
    Object.freeze(this);
  }

  /** Validates a client-supplied slug as is: it is never silently corrected. */
  static create(raw: string, field: string = 'slug'): Slug {
    if (
      typeof raw !== 'string' ||
      raw.length === 0 ||
      raw.length > MAX_LENGTH ||
      !SLUG_PATTERN.test(raw)
    ) {
      throw new InvalidValueException(
        `${field} must contain only lower-case letters and digits separated by single hyphens (max ${MAX_LENGTH} characters)`,
        field,
      );
    }
    return new Slug(raw);
  }

  /**
   * Generates a slug from free text following API-CONVENTIONS §6:
   * 1. đ -> d, Đ -> D.
   * 2. NFKD normalization, strip combining marks (Vietnamese diacritics).
   * 3. Drop every character that is not a letter, digit, underscore, whitespace or hyphen; trim; lower-case.
   * 4. Collapse runs of whitespace and hyphens into a single hyphen.
   * 5. Empty result -> 8 random hex characters.
   *
   * Steps 1-5 can still produce text outside the Slug invariant (underscores, a leading
   * or trailing hyphen, more than 255 characters). Only those results get a final pass:
   * underscores become hyphens, hyphen runs collapse, edge hyphens are trimmed and the
   * text is cut at the length limit. Every other input keeps the §6 result unchanged.
   */
  static fromName(name: string): Slug {
    const text = name
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .toLowerCase();

    let slug = text.replace(/[-\s]+/g, '-');
    if (!SLUG_PATTERN.test(slug) || slug.length > MAX_LENGTH) {
      slug = slug
        .replace(/[_-]+/g, '-')
        .slice(0, MAX_LENGTH)
        .replace(/^-+|-+$/g, '');
    }
    return new Slug(slug || randomBytes(4).toString('hex'));
  }

  equals(other?: Slug | null): boolean {
    return other instanceof Slug && other.value === this.value;
  }

  toString(): string {
    return this.value;
  }
}
