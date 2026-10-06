import Decimal from 'decimal.js';
import { BaseEntity } from '../../../shared/domain/base-entity';

export const DEFAULT_CURRENCY = 'USD';

export interface ProductVariantProps {
  id?: string;
  productId: string;
  sku: string;
  name: string;
  priceAmount: Decimal;
  currency?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Sellable variant of a product (e.g. size M). The price is an exact Decimal,
 * never a JS number. Pure TypeScript: no ORM or framework dependencies.
 */
export class ProductVariant extends BaseEntity {
  private readonly _productId: string;
  private readonly _sku: string;
  private readonly _name: string;
  private readonly _priceAmount: Decimal;
  private readonly _currency: string;

  constructor(props: ProductVariantProps) {
    super(props.id, props.createdAt, props.updatedAt);
    this._productId = props.productId;
    this._sku = props.sku;
    this._name = props.name;
    this._priceAmount = props.priceAmount;
    this._currency = (props.currency ?? DEFAULT_CURRENCY).toUpperCase();
  }

  get productId(): string {
    return this._productId;
  }

  get sku(): string {
    return this._sku;
  }

  get name(): string {
    return this._name;
  }

  get priceAmount(): Decimal {
    return this._priceAmount;
  }

  get currency(): string {
    return this._currency;
  }
}
