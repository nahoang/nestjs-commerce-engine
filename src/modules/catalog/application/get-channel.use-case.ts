import { Injectable } from '@nestjs/common';
import { EntityNotFoundException } from '../../../shared/domain/exceptions';
import { Channel } from '../domain/channel.entity';
import { ChannelRepository } from './channel.repository';

@Injectable()
export class GetChannelUseCase {
  constructor(private readonly channelRepo: ChannelRepository) {}

  async execute(slug: string): Promise<Channel> {
    const channel = await this.channelRepo.findBySlug(slug);
    if (!channel) {
      throw new EntityNotFoundException('Channel', slug);
    }
    return channel;
  }
}
