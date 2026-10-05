import { BaseEntity } from '../../../src/shared/domain/base-entity';

/**
 * Sample Domain Entity for repository and transaction pattern verification.
 * Follows DDD pure TypeScript entity design without ORM dependencies.
 */
export class Sample extends BaseEntity {
  private _name: string;

  constructor(id?: string, name = '', createdAt?: Date, updatedAt?: Date) {
    super(id, createdAt, updatedAt);
    this._name = name;
  }

  get name(): string {
    return this._name;
  }

  changeName(newName: string): void {
    if (!newName || newName.trim().length === 0) {
      throw new Error('Sample name cannot be empty');
    }
    this._name = newName.trim();
  }
}
