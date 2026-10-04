/**
 * Base domain exception for all domain-specific errors.
 * The domain layer is pure TypeScript and must never depend on HTTP concepts or framework classes.
 * Follows API-CONVENTIONS §4 for standardized error representations.
 */
export class DomainException extends Error {
  readonly errorCode: string;

  constructor(message: string, errorCode: string) {
    super(message);
    this.name = this.constructor.name;
    this.errorCode = errorCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when a required domain entity or aggregate cannot be found.
 * Maps to HTTP 404 with error_code 'ENTITY_NOT_FOUND' in API layer.
 */
export class EntityNotFoundException extends DomainException {
  readonly entityName: string;
  readonly entityId: string | number;

  constructor(entityName: string, id: string | number) {
    super(`${entityName} with id '${id}' not found`, 'ENTITY_NOT_FOUND');
    this.entityName = entityName;
    this.entityId = id;
  }
}

/**
 * Thrown when attempting to create or update an entity with a duplicate unique constraint (e.g. slug, SKU, email).
 * Maps to HTTP 409 with error_code 'DUPLICATE_ENTITY' in API layer.
 */
export class DuplicateEntityException extends DomainException {
  constructor(message: string, errorCode: string = 'DUPLICATE_ENTITY') {
    super(message, errorCode);
  }
}

/**
 * Thrown when an inventory stock allocation/reservation cannot be fulfilled due to insufficient quantity.
 * Maps to HTTP 409 with error_code 'INSUFFICIENT_STOCK' in API layer.
 */
export class InsufficientStockException extends DomainException {
  constructor(
    message: string = 'Insufficient stock',
    errorCode: string = 'INSUFFICIENT_STOCK',
  ) {
    super(message, errorCode);
  }
}

/**
 * Thrown when a business rule or entity invariant is violated.
 * Maps to HTTP 400 with error_code 'INVALID_OPERATION' in API layer.
 */
export class InvalidOperationException extends DomainException {
  constructor(message: string, errorCode: string = 'INVALID_OPERATION') {
    super(message, errorCode);
  }
}
