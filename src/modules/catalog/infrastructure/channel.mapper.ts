import { Channel as PrismaChannel, Prisma } from '@prisma/client';
import { Channel } from '../domain/channel.entity';
import { Slug } from '../domain/slug';

/** Separates the Prisma persistence model from the Channel domain entity. */
export class ChannelMapper {
  static toDomain(record: PrismaChannel): Channel {
    return new Channel({
      id: record.id,
      name: record.name,
      slug: Slug.create(record.slug),
      currency: record.currency,
      isActive: record.isActive,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  static toPersistence(entity: Channel): Prisma.ChannelUncheckedCreateInput {
    return {
      id: entity.id,
      name: entity.name,
      slug: entity.slug.value,
      currency: entity.currency,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
