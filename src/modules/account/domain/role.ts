import { InvalidValueException } from '../../../shared/domain/exceptions';

export const ROLES = ['customer', 'staff', 'admin'] as const;

export type Role = (typeof ROLES)[number];

export const DEFAULT_ROLE: Role = 'customer';

export function isRole(value: unknown): value is Role {
  return (
    typeof value === 'string' && (ROLES as readonly string[]).includes(value)
  );
}

/** Narrows an untrusted string (e.g. a database value) to a Role or throws. */
export function parseRole(value: unknown, field: string = 'role'): Role {
  if (!isRole(value)) {
    throw new InvalidValueException(
      `${field} must be one of: ${ROLES.join(', ')}`,
      field,
    );
  }
  return value;
}
