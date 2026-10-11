import { Money } from '../../../shared/domain/value-objects/money';

export interface ChannelPrice {
  price: Money;
  sku: string;
  productName: string;
  variantName: string;
}

/**
 * Port other modules use to read what a channel sells (DI token + contract).
 * Pure application layer: no ORM types.
 */
export abstract class PricingQuery {
  /**
   * Prices of the given variants on a channel, keyed by variant id. Only variants with
   * an AVAILABLE listing on that channel whose product is PUBLISHED are returned; the
   * price is expressed in the channel's currency.
   */
  abstract getChannelPrices(
    channelId: string,
    variantIds: readonly string[],
  ): Promise<Map<string, ChannelPrice>>;

  /** Whether a variant exists at all (to tell "unknown" apart from "not sellable here"). */
  abstract variantExists(variantId: string): Promise<boolean>;
}

