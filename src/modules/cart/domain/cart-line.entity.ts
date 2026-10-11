import { BaseEntity } from '../../../shared/domain/base-entity';

export interface CartLineProps {
  id?: string;
  variantId: string;
  quantity: number;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * One variant and its quantity inside a cart (DOMAIN-SPEC-3-CART § 3.1). It stores
 * no price: the price is read from the channel listing every time the cart is priced.
 * Quantity bounds (R2) are enforced by the owning Cart, which is the only intended
 * caller of `changeQuantity`.
 */
export class CartLine extends BaseEntity {
  readonly variantId: string;
  private _quantity: number;

  constructor(props: CartLineProps) {
    super(props.id, props.createdAt, props.updatedAt);
    this.variantId = props.variantId;
    this._quantity = props.quantity;
  }

  get quantity(): number {
    return this._quantity;
  }

  /** Aggregate-internal: do not call outside Cart, which validates the range. */
  changeQuantity(quantity: number): void {
    this._quantity = quantity;
    this.touch();
  }
}
