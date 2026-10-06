import { BaseEntity } from '../../../shared/domain/base-entity';
import { Money } from '../../../shared/domain/value-objects/money';

export interface ChannelListingProps {
  id?: string;
  variantId: string;
  channelId: string;
  /** Always expressed in the channel's currency (R2); there is no separate currency field. */
  price: Money;
  isAvailable?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Price of one variant on one channel (DOMAIN-SPEC-1-CATALOG § 1.8). The price is a
 * Money value object, so it is exact, non-negative (R3) and carries its currency.
 * Pure TypeScript: no ORM or framework dependencies.
 */
export class ChannelListing extends BaseEntity {
  readonly variantId: string;
  readonly channelId: string;
  private readonly _price: Money;
  private readonly _isAvailable: boolean;

  constructor(props: ChannelListingProps) {
    super(props.id, props.createdAt, props.updatedAt);
    this.variantId = props.variantId;
    this.channelId = props.channelId;
    this._price = props.price;
    this._isAvailable = props.isAvailable ?? true;
  }

  get price(): Money {
    return this._price;
  }

  get isAvailable(): boolean {
    return this._isAvailable;
  }
}
