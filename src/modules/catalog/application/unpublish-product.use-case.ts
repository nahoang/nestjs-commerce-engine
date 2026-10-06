import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Product } from '../domain/product.entity';
import { ChannelListingRepository } from './channel-listing.repository';
import { ProductRepository } from './product.repository';
import { StorefrontCache } from './storefront-cache';
import { EntityNotFoundException } from '../../../shared/domain/exceptions';

@Injectable()
export class UnpublishProductUseCase {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
    private readonly productRepo: ProductRepository,
    private readonly listingRepo: ChannelListingRepository,
    private readonly cache: StorefrontCache,
  ) {}

  async execute(productId: string): Promise<Product> {
    const { product, channelIds } = await this.txHost.withTransaction(
      async () => {
        const found = await this.productRepo.findByIdForUpdate(productId);
        if (!found) {
          throw new EntityNotFoundException('Product', productId);
        }

        found.unpublish();
        await this.productRepo.save(found);
        return {
          product: found,
          channelIds:
            await this.listingRepo.findChannelIdsByProductId(productId),
        };
      },
    );

    // 1.8 R8: storefronts of every channel listing this product change; clear after COMMIT
    await Promise.all(channelIds.map((id) => this.cache.invalidateChannel(id)));
    return product;
  }
}
