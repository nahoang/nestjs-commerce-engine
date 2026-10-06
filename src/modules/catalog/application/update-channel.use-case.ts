import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { EntityNotFoundException } from '../../../shared/domain/exceptions';
import { Channel } from '../domain/channel.entity';
import { ChannelRepository } from './channel.repository';
import { StorefrontCache } from './storefront-cache';

/** R2: the command has no currency (or slug): they cannot be changed after creation. */
export interface UpdateChannelCommand {
  slug: string;
  name?: string;
  isActive?: boolean;
}

@Injectable()
export class UpdateChannelUseCase {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
    private readonly channelRepo: ChannelRepository,
    private readonly cache: StorefrontCache,
  ) {}

  async execute(command: UpdateChannelCommand): Promise<Channel> {
    const channel = await this.txHost.withTransaction(async () => {
      const found = await this.channelRepo.findBySlug(command.slug);
      if (!found) {
        throw new EntityNotFoundException('Channel', command.slug);
      }

      if (command.name !== undefined) {
        found.rename(command.name);
      }
      if (command.isActive === true) {
        found.activate();
      } else if (command.isActive === false) {
        found.deactivate();
      }

      await this.channelRepo.save(found);
      return found;
    });

    // 1.8 R8: switching a channel on/off must show at the next storefront request
    await this.cache.invalidateChannel(channel.id);
    return channel;
  }
}
