import { BaseEntity } from '../../../shared/domain/base-entity';

export interface CategoryProps {
  id?: string;
  name: string;
  slug: string;
  parentId?: string | null;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Category domain entity.
 * Follows DDD and Clean Architecture: pure TypeScript without ORM or framework dependencies.
 */
export class Category extends BaseEntity {
  private _name: string;
  private _slug: string;
  private _parentId: string | null;
  private _isActive: boolean;

  constructor(props: CategoryProps) {
    super(props.id, props.createdAt, props.updatedAt);
    this._name = props.name;
    this._slug = props.slug;
    this._parentId = props.parentId ?? null;
    this._isActive = props.isActive ?? true;
  }

  get name(): string {
    return this._name;
  }

  get slug(): string {
    return this._slug;
  }

  get parentId(): string | null {
    return this._parentId;
  }

  get isActive(): boolean {
    return this._isActive;
  }
}
