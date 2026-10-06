import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { ListParams } from '../../../shared/application/repository';
import { DuplicateEntityException } from '../../../shared/domain/exceptions';
import { uniqueViolationTargets } from '../../../shared/infrastructure/prisma/prisma-errors';
import { Channel } from '../domain/channel.entity';
import { ChannelRepository } from '../application/channel.repository';
import { ChannelMapper } from './channel.mapper';

@Injectable()
export class PrismaChannelRepository implements ChannelRepository {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {}

  async findBySlug(slug: string): Promise<Channel | null> {
    const record = await this.txHost.tx.channel.findUnique({ where: { slug } });
    return record ? ChannelMapper.toDomain(record) : null;
  }

  // Deterministic order: created_at ASC, id ASC
  async list(params?: ListParams): Promise<Channel[]> {
    const records = await this.txHost.tx.channel.findMany({
      skip: params?.offset ?? 0,
      take: params?.limit ?? 20,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return records.map((r) => ChannelMapper.toDomain(r));
  }

  async count(): Promise<number> {
    return this.txHost.tx.channel.count();
  }

  // Slug and currency are never rewritten on update (R2)
  async save(entity: Channel): Promise<void> {
    const data = ChannelMapper.toPersistence(entity);
    try {
      await this.txHost.tx.channel.upsert({
        where: { id: entity.id },
        create: data,
        update: {
          name: data.name,
          isActive: data.isActive,
          updatedAt: data.updatedAt,
        },
      });
    } catch (error) {
      if (uniqueViolationTargets(error) !== null) {
        throw new DuplicateEntityException(
          'A channel with this slug already exists',
        );
      }
      throw error;
    }
  }
}
