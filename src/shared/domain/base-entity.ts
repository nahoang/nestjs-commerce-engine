/**
 * Base abstract class for all domain entities in Clean Architecture / DDD.
 * Entities are distinguished by their identity (id), not by their attributes.
 *
 * Enforces pure TypeScript: no framework or ORM dependencies allowed in the domain layer.
 */
export abstract class BaseEntity {
  readonly id: string;
  readonly createdAt: Date;
  private _updatedAt: Date;

  protected constructor(id?: string, createdAt?: Date, updatedAt?: Date) {
    this.id = id ?? crypto.randomUUID();
    const now = new Date();
    this.createdAt = createdAt ?? now;
    this._updatedAt = updatedAt ?? now;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  /** Marks the entity as modified; call from every state-changing behavior. */
  protected touch(): void {
    this._updatedAt = new Date();
  }

  /**
   * Compares entity equality by identity and concrete entity type.
   */
  equals(other?: BaseEntity | null): boolean {
    if (other === null || other === undefined) {
      return false;
    }

    if (this === other) {
      return true;
    }

    if (!(other instanceof BaseEntity)) {
      return false;
    }

    if (this.constructor !== other.constructor) {
      return false;
    }

    return this.id === other.id;
  }
}
