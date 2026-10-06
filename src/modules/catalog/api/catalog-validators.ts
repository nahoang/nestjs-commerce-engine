import { ValueObjectValid } from '../../../shared/api/validators/value-object.validator';
import { InvalidValueException } from '../../../shared/domain/exceptions';
import { Sku } from '../domain/sku';
import { Slug } from '../domain/slug';

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new InvalidValueException(`${field} must be a string`, field);
  }
  return value;
}

/** A client-supplied slug must already be valid: it is validated, never corrected. */
export function IsSlug(): PropertyDecorator {
  return ValueObjectValid((value, field) =>
    Slug.create(requireString(value, field), field),
  );
}

/** A SKU is valid when Sku.create accepts it (trim + upper case, then pattern). */
export function IsSku(): PropertyDecorator {
  return ValueObjectValid((value, field) =>
    Sku.create(requireString(value, field), field),
  );
}
