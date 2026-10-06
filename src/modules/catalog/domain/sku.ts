import { InvalidValueException } from '../../../shared/domain/exceptions';

const SKU_PATTERN = /^[A-Z0-9][A-Z0-9_-]{0,99}$/;

/**
 * Stock keeping unit code. Trimmed and upper-cased on creation, so two SKUs that differ
 * only by case are the same value (and the stored form is already normalized).
 */
export class Sku {
  private constructor(readonly value: string) {
    Object.freeze(this);
  }

  static create(raw: string, field: string = 'sku'): Sku {
    const normalized = typeof raw === 'string' ? raw.trim().toUpperCase() : '';
    if (!SKU_PATTERN.test(normalized)) {
      throw new InvalidValueException(
        `${field} must start with a letter or digit and contain only letters, digits, underscores and hyphens (max 100 characters)`,
        field,
      );
    }
    return new Sku(normalized);
  }

  equals(other?: Sku | null): boolean {
    return other instanceof Sku && other.value === this.value;
  }

  toString(): string {
    return this.value;
  }
}
