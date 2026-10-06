import {
  DomainException,
  EntityNotFoundException,
  DuplicateEntityException,
  InsufficientStockException,
  InvalidOperationException,
  InvalidValueException,
} from './exceptions';

describe('Domain Exceptions', () => {
  describe('DomainException', () => {
    it('should set message and errorCode properly and extend Error', () => {
      const ex = new DomainException('Something failed', 'CUSTOM_ERROR');

      expect(ex).toBeInstanceOf(Error);
      expect(ex).toBeInstanceOf(DomainException);
      expect(ex.name).toBe('DomainException');
      expect(ex.message).toBe('Something failed');
      expect(ex.errorCode).toBe('CUSTOM_ERROR');
    });
  });

  describe('EntityNotFoundException', () => {
    it('should format message with entityName and id, and set errorCode to ENTITY_NOT_FOUND', () => {
      const ex = new EntityNotFoundException('Product', 'prod-123');

      expect(ex).toBeInstanceOf(DomainException);
      expect(ex).toBeInstanceOf(EntityNotFoundException);
      expect(ex.name).toBe('EntityNotFoundException');
      expect(ex.message).toBe("Product with id 'prod-123' not found");
      expect(ex.errorCode).toBe('ENTITY_NOT_FOUND');
      expect(ex.entityName).toBe('Product');
      expect(ex.entityId).toBe('prod-123');
    });
  });

  describe('DuplicateEntityException', () => {
    it('should default errorCode to DUPLICATE_ENTITY', () => {
      const ex = new DuplicateEntityException('Email already in use');

      expect(ex).toBeInstanceOf(DomainException);
      expect(ex).toBeInstanceOf(DuplicateEntityException);
      expect(ex.message).toBe('Email already in use');
      expect(ex.errorCode).toBe('DUPLICATE_ENTITY');
    });

    it('should allow custom errorCode if provided', () => {
      const ex = new DuplicateEntityException(
        'Voucher exhausted',
        'VOUCHER_EXHAUSTED',
      );

      expect(ex.errorCode).toBe('VOUCHER_EXHAUSTED');
    });
  });

  describe('InsufficientStockException', () => {
    it('should set default message and errorCode to INSUFFICIENT_STOCK', () => {
      const ex = new InsufficientStockException();

      expect(ex).toBeInstanceOf(DomainException);
      expect(ex).toBeInstanceOf(InsufficientStockException);
      expect(ex.message).toBe('Insufficient stock');
      expect(ex.errorCode).toBe('INSUFFICIENT_STOCK');
    });

    it('should accept custom message', () => {
      const ex = new InsufficientStockException('Only 2 items left');

      expect(ex.message).toBe('Only 2 items left');
      expect(ex.errorCode).toBe('INSUFFICIENT_STOCK');
    });
  });

  describe('InvalidOperationException', () => {
    it('should set message and default errorCode to INVALID_OPERATION', () => {
      const ex = new InvalidOperationException('Cannot cancel shipped order');

      expect(ex).toBeInstanceOf(DomainException);
      expect(ex).toBeInstanceOf(InvalidOperationException);
      expect(ex.message).toBe('Cannot cancel shipped order');
      expect(ex.errorCode).toBe('INVALID_OPERATION');
    });

    it('should allow custom errorCode if provided', () => {
      const ex = new InvalidOperationException(
        'Invalid state transition',
        'INVALID_STATE_TRANSITION',
      );

      expect(ex.errorCode).toBe('INVALID_STATE_TRANSITION');
    });
  });

  describe('InvalidValueException', () => {
    it('defaults errorCode to VALIDATION_ERROR and keeps the field', () => {
      const ex = new InvalidValueException('slug is invalid', 'slug');

      expect(ex).toBeInstanceOf(DomainException);
      expect(ex.errorCode).toBe('VALIDATION_ERROR');
      expect(ex.field).toBe('slug');
    });

    it('works without a field', () => {
      expect(new InvalidValueException('bad').field).toBeUndefined();
    });
  });
});
