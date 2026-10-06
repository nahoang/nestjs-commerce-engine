import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { EntityNotFoundException } from '../../../shared/domain/exceptions';
import { Channel } from '../domain/channel.entity';
import { ChannelRepository } from './channel.repository';

/** R2: the command has no currency (or slug): they cannot be changed after creation. */
export interface UpdateChannelCommand {
  slug: string;
  name?: string;
  isActive?: boolean;
}

@Injectable()
export class UpdateChannelUseCase {
  constructor(private readonly channelRepo: ChannelRepository) {}

  @Transactional()
  async execute(command: UpdateChannelCommand): Promise<Channel> {
    const channel = await this.channelRepo.findBySlug(command.slug);
    if (!channel) {
      throw new EntityNotFoundException('Channel', command.slug);
    }

    if (command.name !== undefined) {
      channel.rename(command.name);
    }
    if (command.isActive === true) {
      channel.activate();
    } else if (command.isActive === false) {
      channel.deactivate();
    }

    await this.channelRepo.save(channel);
    return channel;
  }
}
