import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { EntityNotFoundException } from '../../../shared/domain/exceptions';
import { Money } from '../../../shared/domain/value-objects/money';
import { ChannelListing } from '../domain/channel-listing.entity';
import { ChannelListingRepository } from './channel-listing.repository';
import { ChannelRepository } from './channel.repository';
import { ProductRepository } from './product.repository';
import { StorefrontCache } from './storefront-cache';

export interface CreateListingCommand {
  channelSlug: string;
  variantId: string;
  priceAmount: string;
  isAvailable?: boolean;
}

@Injectable()
export class CreateListingUseCase {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
    private readonly channelRepo: ChannelRepository,
    private readonly productRepo: ProductRepository,
    private readonly listingRepo: ChannelListingRepository,
    private readonly cache: StorefrontCache,
  ) {}

  async execute(command: CreateListingCommand): Promise<ChannelListing> {
    const { channelId, listing } = await this.txHost.withTransaction(
      async () => {
        // Inactive channels stay manageable (1.7 R4), so only existence is checked
        const channel = await this.channelRepo.findBySlug(command.channelSlug);
        if (!channel) {
          throw new EntityNotFoundException('Channel', command.channelSlug);
        }
        const variant = await this.productRepo.findVariantById(
          command.variantId,
        );
        if (!variant) {
          throw new EntityNotFoundException(
            'ProductVariant',
            command.variantId,
          );
        }

        // R2/R3: the currency comes from the channel; Money validates the amount
        const created = new ChannelListing({
          variantId: variant.id,
          channelId: channel.id,
          price: Money.create(command.priceAmount, channel.currency),
          isAvailable: command.isAvailable,
        });
        // R1: the UNIQUE (variant_id, channel_id) violation becomes a 409
        await this.listingRepo.save(created);
        return { channelId: channel.id, listing: created };
      },
    );

    // R8: after COMMIT, so no request can re-cache the old data once this returns
    await this.cache.invalidateChannel(channelId);
    return listing;
  }
}
