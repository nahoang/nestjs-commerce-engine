import { InvalidValueException } from '../../../shared/domain/exceptions';

const MAX_LENGTH = 255;
// Pragmatic shape check (local@domain.tld, no spaces); deliverability is not verified here
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

/**
 * Email address value object. Immutable, compared by value, valid by construction:
 * stored trimmed and lower-cased so uniqueness is case-insensitive (R1).
 */
export class Email {
  private constructor(readonly value: string) {
    Object.freeze(this);
  }

  static create(raw: string, field: string = 'email'): Email {
    const value = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
    if (
      value.length === 0 ||
      value.length > MAX_LENGTH ||
      !EMAIL_PATTERN.test(value)
    ) {
      throw new InvalidValueException(
        `${field} must be a valid email address (max ${MAX_LENGTH} characters)`,
        field,
      );
    }
    return new Email(value);
  }

  equals(other?: Email | null): boolean {
    return other instanceof Email && other.value === this.value;
  }

  toString(): string {
    return this.value;
  }
}
