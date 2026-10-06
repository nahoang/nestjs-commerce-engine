import { Injectable } from '@nestjs/common';
import { ListParams } from '../../../shared/application/repository';
import { EntityNotFoundException } from '../../../shared/domain/exceptions';
import { ChannelRepository } from './channel.repository';
import { ProductRepository } from './product.repository';
import { StorefrontCache } from './storefront-cache';
import { StorefrontPage } from './storefront-view';

@Injectable()
export class GetChannelStorefrontUseCase {
  constructor(
    private readonly channelRepo: ChannelRepository,
    private readonly productRepo: ProductRepository,
    private readonly cache: StorefrontCache,
  ) {}

  async execute(
    channelSlug: string,
    page: Required<ListParams>,
  ): Promise<StorefrontPage> {
    // R6: unknown or switched-off channel -> 404. Always read fresh, never cached.
    const channel = await this.channelRepo.findBySlug(channelSlug);
    if (!channel || !channel.isActive) {
      throw new EntityNotFoundException('Channel', channelSlug);
    }

    const lookup = await this.cache.lookup(
      channel.id,
      `${page.limit}:${page.offset}`,
    );
    if (lookup.page) {
      return lookup.page;
    }

    // R4/R5: published products with available listings, priced in the channel's currency
    const loaded = await this.productRepo.listForChannel(
      { id: channel.id, currency: channel.currency },
      page,
    );
    await lookup.save(loaded);
    return loaded;
  }
}
