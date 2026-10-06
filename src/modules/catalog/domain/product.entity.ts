import { BaseEntity } from '../../../shared/domain/base-entity';

export interface ProductProps {
  id?: string;
  name: string;
  slug: string;
  categoryId?: string | null;
  description?: string | null;
  isPublished?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Product domain entity (variants are added in a later step).
 * Pure TypeScript: no ORM or framework dependencies.
 */
export class Product extends BaseEntity {
  private _name: string;
  private _slug: string;
  private _categoryId: string | null;
  private _description: string | null;
  private _isPublished: boolean;

  constructor(props: ProductProps) {
    super(props.id, props.createdAt, props.updatedAt);
    this._name = props.name;
    this._slug = props.slug;
    this._categoryId = props.categoryId ?? null;
    this._description = props.description ?? null;
    this._isPublished = props.isPublished ?? false;
  }

  get name(): string {
    return this._name;
  }

  get slug(): string {
    return this._slug;
  }

  get categoryId(): string | null {
    return this._categoryId;
  }

  get description(): string | null {
    return this._description;
  }

  get isPublished(): boolean {
    return this._isPublished;
  }
}
