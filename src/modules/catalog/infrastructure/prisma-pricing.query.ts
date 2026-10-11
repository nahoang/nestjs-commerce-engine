import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Money } from '../../../shared/domain/value-objects/money';
import { ChannelPrice, PricingQuery } from '../application/pricing-query';

@Injectable()
export class PrismaPricingQuery implements PricingQuery {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {}

  // One query regardless of the number of variants; the listing has no currency of its own,
  // so it is read from the channel row joined in the same query (R2 of 1.8)
  async getChannelPrices(
    channelId: string,
    variantIds: readonly string[],
  ): Promise<Map<string, ChannelPrice>> {
    const prices = new Map<string, ChannelPrice>();
    if (variantIds.length === 0) {
      return prices;
    }
    const rows = await this.txHost.tx.productVariantChannelListing.findMany({
      where: {
        channelId,
        variantId: { in: [...variantIds] },
        isAvailable: true,
        variant: { product: { isPublished: true } },
      },
      select: {
        variantId: true,
        priceAmount: true,
        channel: { select: { currency: true } },
        variant: {
          select: {
            sku: true,
            name: true,
            product: { select: { name: true } },
          },
        },
      },
    });
    for (const row of rows) {
      prices.set(row.variantId, {
        price: Money.create(row.priceAmount.toFixed(2), row.channel.currency),
        sku: row.variant.sku,
        productName: row.variant.product.name,
        variantName: row.variant.name,
      });
    }
    return prices;
  }

  async variantExists(variantId: string): Promise<boolean> {
    const count = await this.txHost.tx.productVariant.count({
      where: { id: variantId },
    });
    return count > 0;
  }
}
