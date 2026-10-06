import { BaseEntity } from '../../../shared/domain/base-entity';
import {
  DuplicateEntityException,
  InvalidOperationException,
} from '../../../shared/domain/exceptions';
import { Money } from '../../../shared/domain/value-objects/money';
import { ProductVariant } from './product-variant.entity';
import { Sku } from './sku';
import { Slug } from './slug';

export interface NewVariantProps {
  sku: Sku;
  name: string;
  price: Money;
}

export interface ProductProps {
  id?: string;
  name: string;
  slug: Slug;
  categoryId?: string | null;
  description?: string | null;
  /** Only for rehydrating a stored product; new products start as drafts and use publish(). */
  isPublished?: boolean;
  variants?: ProductVariant[];
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Product aggregate root. Owns its variants and the rules that span them:
 * - R2: SKUs are unique within the product, ignoring case (Sku is normalized).
 * - R4: every variant is priced in the same currency.
 * - R3: a product can only be published once it has at least one variant.
 * Pure TypeScript: no ORM or framework dependencies.
 */
export class Product extends BaseEntity {
  private _name: string;
  private _slug: Slug;
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

  get slug(): Slug {
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
   * Adds a variant owned by this product. Both checks run before anything changes,
   * so a rejected call leaves the product untouched.
   */
  addVariant(props: NewVariantProps): ProductVariant {
    if (this._variants.some((v) => v.sku.equals(props.sku))) {
      throw new DuplicateEntityException(
        `Duplicate SKU '${props.sku.value}' for product '${this._slug.value}'`,
      );
    }
    const currency = this._variants[0]?.price.currency;
    if (currency !== undefined && currency !== props.price.currency) {
      throw new InvalidOperationException(
        `Product '${this._slug.value}' is priced in ${currency}; cannot add a variant priced in ${props.price.currency}`,
      );
    }
    const variant = new ProductVariant({ ...props, productId: this.id });
    this._variants.push(variant);
    this.touch();
    return variant;
  }

  /** R3: only a product with at least one variant can be published. Idempotent. */
  publish(): void {
    if (this._variants.length === 0) {
      throw new InvalidOperationException(
        `Product '${this._slug.value}' cannot be published without at least one variant`,
      );
    }
    if (!this._isPublished) {
      this._isPublished = true;
      this.touch();
    }
  }

  /** Returns a published product to draft. Idempotent. */
  unpublish(): void {
    if (this._isPublished) {
      this._isPublished = false;
      this.touch();
    }
  }
}
