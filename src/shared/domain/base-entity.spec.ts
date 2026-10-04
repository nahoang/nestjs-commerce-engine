import { BaseEntity } from './base-entity';

class OrderEntity extends BaseEntity {
  constructor(id?: string, createdAt?: Date, updatedAt?: Date) {
    super(id, createdAt, updatedAt);
  }
}

class CustomerEntity extends BaseEntity {
  constructor(id?: string, createdAt?: Date, updatedAt?: Date) {
    super(id, createdAt, updatedAt);
  }
}

describe('BaseEntity', () => {
  describe('equals', () => {
    it('should return true when comparing entities of the same type with the same id', () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const order1 = new OrderEntity(id);
      const order2 = new OrderEntity(id);

      expect(order1.equals(order2)).toBe(true);
      expect(order2.equals(order1)).toBe(true);
    });

    it('should return false when comparing entities with different ids', () => {
      const order1 = new OrderEntity('id-1');
      const order2 = new OrderEntity('id-2');

      expect(order1.equals(order2)).toBe(false);
      expect(order2.equals(order1)).toBe(false);
    });

    it('should return true when comparing the exact same instance', () => {
      const order = new OrderEntity('id-same');

      expect(order.equals(order)).toBe(true);
    });

    it('should return false when comparing with null or undefined', () => {
      const order = new OrderEntity('id-valid');

      expect(order.equals(null)).toBe(false);
      expect(order.equals(undefined)).toBe(false);
    });

    it('should return false when comparing with a non-BaseEntity plain object', () => {
      const id = 'matching-id';
      const order = new OrderEntity(id);
      const plainObject = { id, createdAt: new Date(), updatedAt: new Date() };

      expect(order.equals(plainObject as unknown as BaseEntity)).toBe(false);
    });

    it('should return false when comparing different entity types even with the same id', () => {
      const sharedId = 'shared-uuid-1234';
      const order = new OrderEntity(sharedId);
      const customer = new CustomerEntity(sharedId);

      expect(order.equals(customer)).toBe(false);
      expect(customer.equals(order)).toBe(false);
    });
  });

  describe('initialization', () => {
    it('should auto-generate a valid UUID if id is not supplied', () => {
      const order = new OrderEntity();

      expect(order.id).toBeDefined();
      expect(typeof order.id).toBe('string');
      expect(order.id.length).toBeGreaterThan(0);
      expect(order.createdAt).toBeInstanceOf(Date);
      expect(order.updatedAt).toBeInstanceOf(Date);
    });

    it('should preserve provided id and timestamp dates', () => {
      const customId = 'custom-id-999';
      const customCreatedAt = new Date('2026-01-01T00:00:00.000Z');
      const customUpdatedAt = new Date('2026-01-02T12:00:00.000Z');

      const order = new OrderEntity(customId, customCreatedAt, customUpdatedAt);

      expect(order.id).toBe(customId);
      expect(order.createdAt).toEqual(customCreatedAt);
      expect(order.updatedAt).toEqual(customUpdatedAt);
    });
  });
});
