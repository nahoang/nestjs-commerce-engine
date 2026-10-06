import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { DuplicateEntityException } from '../../../shared/domain/exceptions';
import { uniqueViolationTargets } from '../../../shared/infrastructure/prisma/prisma-errors';
import { ChannelListing } from '../domain/channel-listing.entity';
import { ChannelListingRepository } from '../application/channel-listing.repository';

@Injectable()
export class PrismaChannelListingRepository implements ChannelListingRepository {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {}

  // Only the amount is stored: the currency is the channel's (R2)
  async save(listing: ChannelListing): Promise<void> {
    try {
      await this.txHost.tx.productVariantChannelListing.create({
        data: {
          id: listing.id,
          variantId: listing.variantId,
          channelId: listing.channelId,
          priceAmount: listing.price.amount.toFixed(2),
          isAvailable: listing.isAvailable,
          createdAt: listing.createdAt,
          updatedAt: listing.updatedAt,
        },
      });
    } catch (error) {
      if (uniqueViolationTargets(error) !== null) {
        throw new DuplicateEntityException(
          'This variant already has a listing on this channel',
        );
      }
      throw error;
    }
  }

  async findChannelIdsByProductId(productId: string): Promise<string[]> {
    const rows = await this.txHost.tx.productVariantChannelListing.findMany({
      where: { variant: { productId } },
      select: { channelId: true },
      distinct: ['channelId'],
    });
    return rows.map((row) => row.channelId);
  }
}
