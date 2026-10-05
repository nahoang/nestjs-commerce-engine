import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { ListParams } from '../../../shared/application/repository';
import { Category } from '../domain/category.entity';
import { CategoryRepository } from '../application/category.repository';
import { CategoryMapper } from './category.mapper';

/**
 * Prisma implementation of CategoryRepository.
 * Uses TransactionHost for transactional safety with @Transactional() boundary.
 */
@Injectable()
export class PrismaCategoryRepository implements CategoryRepository {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {}

  async findById(id: string): Promise<Category | null> {
    const record = await this.txHost.tx.category.findUnique({
      where: { id },
    });
    return record ? CategoryMapper.toDomain(record) : null;
  }

  async findBySlug(slug: string): Promise<Category | null> {
    const record = await this.txHost.tx.category.findUnique({
      where: { slug },
    });
    return record ? CategoryMapper.toDomain(record) : null;
  }

  async list(params?: ListParams): Promise<Category[]> {
    const skip = params?.offset ?? 0;
    const take = params?.limit ?? 20;

    const records = await this.txHost.tx.category.findMany({
      skip,
      take,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    return records.map((r) => CategoryMapper.toDomain(r));
  }

  async count(): Promise<number> {
    return this.txHost.tx.category.count();
  }

  async save(entity: Category): Promise<void> {
    const data = CategoryMapper.toPersistence(entity);
    await this.txHost.tx.category.upsert({
      where: { id: entity.id },
      create: data,
      update: {
        name: data.name,
        slug: data.slug,
        parentId: data.parentId,
        isActive: data.isActive,
        updatedAt: new Date(),
      },
    });
  }
}
