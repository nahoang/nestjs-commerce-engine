import { Injectable } from '@nestjs/common';
import { EntityNotFoundException } from '../../../shared/domain/exceptions';
import { Money } from '../../../shared/domain/value-objects/money';
import { ChannelRepository } from '../../catalog/application/channel.repository';
import { PricingQuery } from '../../catalog/application/pricing-query';
import { Cart, CartStatus } from '../domain/cart.entity';

export interface CartLineView {
  id: string;
  variantId: string;
  /** Catalog details are null when the variant is not sellable on the channel any more. */
  sku: string | null;
  productName: string | null;
  variantName: string | null;
  quantity: number;
  unitPrice: Money | null;
  lineTotal: Money | null;
  isAvailable: boolean;
  /** Filled by 3.4 (reservations). */
  reservedUntil: Date | null;
}

export interface CartView {
  token: string;
  channelSlug: string;
  currency: string;
  status: CartStatus;
  lines: CartLineView[];
  subtotal: Money;
  /** Filled by 3.6 (vouchers). */
  voucherCode: string | null;
  discount: Money;
  total: Money;
}

/**
 * Builds the CartView (DOMAIN-SPEC-3-CART § 3.2 R4): prices are re-read from the
 * channel listings on every call and never stored on the cart.
 */
@Injectable()
export class CartViewAssembler {
  constructor(
    private readonly channelRepo: ChannelRepository,
    private readonly pricingQuery: PricingQuery,
  ) {}

  async assemble(cart: Cart): Promise<CartView> {
    const channel = await this.channelRepo.findById(cart.channelId);
    if (!channel) {
      throw new EntityNotFoundException('Channel', cart.channelId);
    }
    const catalog = await this.pricingQuery.getChannelPrices(
      cart.channelId,
      cart.lines.map((l) => l.variantId),
    );
    const prices = new Map(
      [...catalog].map(([variantId, entry]) => [variantId, entry.price]),
    );
    const pricing = cart.price(prices);

    const lines = pricing.lines.map<CartLineView>((priced) => {
      const info = catalog.get(priced.variantId);
      return {
        id: priced.lineId,
        variantId: priced.variantId,
        sku: info?.sku ?? null,
        productName: info?.productName ?? null,
        variantName: info?.variantName ?? null,
        quantity: priced.quantity,
        unitPrice: priced.unitPrice,
        lineTotal: priced.lineTotal,
        isAvailable: priced.isAvailable,
        reservedUntil: null,
      };
    });
    const discount = Money.create('0', cart.currency);
    return {
      token: cart.token,
      channelSlug: channel.slug.value,
      currency: cart.currency,
      status: cart.status,
      lines,
      subtotal: pricing.subtotal,
      voucherCode: null,
      discount,
      total: pricing.subtotal,
    };
  }
}

