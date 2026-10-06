import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { ListParams } from '../../../shared/application/repository';
import { Product } from '../domain/product.entity';
import { ProductRepository } from '../application/product.repository';
import { ProductMapper } from './product.mapper';

/**
 * Prisma implementation of ProductRepository.
 * Uses TransactionHost so queries join the @Transactional() boundary of the use case.
 */
@Injectable()
export class PrismaProductRepository implements ProductRepository {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {}

  async findById(id: string): Promise<Product | null> {
    const record = await this.txHost.tx.product.findUnique({ where: { id } });
    return record ? ProductMapper.toDomain(record) : null;
  }

  async findBySlug(slug: string): Promise<Product | null> {
    const record = await this.txHost.tx.product.findUnique({ where: { slug } });
    return record ? ProductMapper.toDomain(record) : null;
  }

  // R5: deterministic order: created_at DESC, id DESC
  async list(params?: ListParams): Promise<Product[]> {
    const records = await this.txHost.tx.product.findMany({
      skip: params?.offset ?? 0,
      take: params?.limit ?? 20,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    return records.map((r) => ProductMapper.toDomain(r));
  }

  async count(): Promise<number> {
    return this.txHost.tx.product.count();
  }

  async save(entity: Product): Promise<void> {
    const data = ProductMapper.toPersistence(entity);
    await this.txHost.tx.product.upsert({
      where: { id: entity.id },
      create: data,
      update: {
        name: data.name,
        slug: data.slug,
        categoryId: data.categoryId,
        description: data.description,
        isPublished: data.isPublished,
        updatedAt: new Date(),
      },
    });
  }
}
