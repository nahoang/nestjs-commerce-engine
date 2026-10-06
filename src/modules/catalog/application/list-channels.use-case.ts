import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { ListParams } from '../../../shared/application/repository';
import { Channel } from '../domain/channel.entity';
import { ChannelRepository } from './channel.repository';

export interface ListChannelsResult {
  items: Channel[];
  total: number;
}

@Injectable()
export class ListChannelsUseCase {
  constructor(private readonly channelRepo: ChannelRepository) {}

  // Read transaction so the page and the total see the same data
  @Transactional()
  async execute(params?: ListParams): Promise<ListChannelsResult> {
    const items = await this.channelRepo.list(params);
    const total = await this.channelRepo.count();
    return { items, total };
  }
}
