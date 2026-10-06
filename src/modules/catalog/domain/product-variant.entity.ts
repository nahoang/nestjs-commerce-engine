import { BaseEntity } from '../../../shared/domain/base-entity';
import { Money } from '../../../shared/domain/value-objects/money';
import { Sku } from './sku';

export const DEFAULT_CURRENCY = 'USD';

export interface ProductVariantProps {
  id?: string;
  productId: string;
  sku: Sku;
  name: string;
  price: Money;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Sellable variant of a product (e.g. size M). The price is a Money value object
 * (exact decimal, never a JS number). Pure TypeScript: no ORM or framework dependencies.
 */
export class ProductVariant extends BaseEntity {
  private readonly _productId: string;
  private readonly _sku: Sku;
  private readonly _name: string;
  private readonly _price: Money;

  constructor(props: ProductVariantProps) {
    super(props.id, props.createdAt, props.updatedAt);
    this._productId = props.productId;
    this._sku = props.sku;
    this._name = props.name;
    this._price = props.price;
  }

  get productId(): string {
    return this._productId;
  }

  get sku(): Sku {
    return this._sku;
  }

  get name(): string {
    return this._name;
  }

  get price(): Money {
    return this._price;
  }
}
