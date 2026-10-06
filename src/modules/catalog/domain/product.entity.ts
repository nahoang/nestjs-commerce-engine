import Decimal from 'decimal.js';
import { BaseEntity } from '../../../shared/domain/base-entity';
import { DuplicateEntityException } from '../../../shared/domain/exceptions';
import { ProductVariant } from './product-variant.entity';

export interface NewVariantProps {
  sku: string;
  name: string;
  priceAmount: Decimal;
  currency?: string;
}

export interface ProductProps {
  id?: string;
  name: string;
  slug: string;
  categoryId?: string | null;
  description?: string | null;
  isPublished?: boolean;
  variants?: ProductVariant[];
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Product domain entity and aggregate root of its variants.
 * Pure TypeScript: no ORM or framework dependencies.
 */
export class Product extends BaseEntity {
  private _name: string;
  private _slug: string;
  private _categoryId: string | null;
  private _description: string | null;
  private _isPublished: boolean;
  private readonly _variants: ProductVariant[];

  constructor(props: ProductProps) {
    super(props.id, props.createdAt, props.updatedAt);
    this._name = props.name;
    this._slug = props.slug;
    this._categoryId = props.categoryId ?? null;
    this._description = props.description ?? null;
    this._isPublished = props.isPublished ?? false;
    this._variants = [...(props.variants ?? [])];
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

  get variants(): readonly ProductVariant[] {
    return this._variants;
  }

  /**
   * Adds a variant owned by this product.
   * R2: SKUs must be unique within the product (system-wide uniqueness, R1, is
   * enforced by the database and surfaced by the repository).
   */
  addVariant(props: NewVariantProps): ProductVariant {
    if (this._variants.some((v) => v.sku === props.sku)) {
      throw new DuplicateEntityException(
        `Duplicate SKU '${props.sku}' for product '${this.slug}'`,
      );
    }
    const variant = new ProductVariant({ ...props, productId: this.id });
    this._variants.push(variant);
    return variant;
  }
}
