import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { DuplicateEntityException } from '../../../shared/domain/exceptions';
import { Channel } from '../domain/channel.entity';
import { Slug } from '../domain/slug';
import { ChannelRepository } from './channel.repository';

export interface CreateChannelCommand {
  name: string;
  slug?: string;
  currency: string;
  isActive?: boolean;
}

@Injectable()
export class CreateChannelUseCase {
  constructor(private readonly channelRepo: ChannelRepository) {}

  @Transactional()
  async execute(command: CreateChannelCommand): Promise<Channel> {
    const name = command.name.trim();

    // R1: no slug supplied -> generate one from the name; a supplied slug must already be valid
    const suppliedSlug = command.slug?.trim();
    const slug = suppliedSlug ? Slug.create(suppliedSlug) : Slug.fromName(name);

    if (await this.channelRepo.findBySlug(slug.value)) {
      throw new DuplicateEntityException(
        `Channel with slug '${slug.value}' already exists`,
      );
    }

    const channel = new Channel({
      name,
      slug,
      currency: command.currency,
      isActive: command.isActive,
    });
    await this.channelRepo.save(channel);
    return channel;
  }
}
