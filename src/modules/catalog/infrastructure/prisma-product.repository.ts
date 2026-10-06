import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { ListParams } from '../../../shared/application/repository';
import { Prisma } from '@prisma/client';
import { uniqueViolationTargets } from '../../../shared/infrastructure/prisma/prisma-errors';
import { DuplicateEntityException } from '../../../shared/domain/exceptions';
import { Product } from '../domain/product.entity';
import { ProductVariant } from '../domain/product-variant.entity';
import { ProductRepository } from '../application/product.repository';
import { ProductMapper } from './product.mapper';

// Variants are loaded with the product in one extra query (WHERE product_id IN (...)),
// so the query count stays constant regardless of how many products are listed.
// Ordered by sku (unique) for a deterministic response.
const WITH_VARIANTS = {
  variants: { orderBy: [{ createdAt: 'asc' }, { sku: 'asc' }] },
} satisfies Prisma.ProductInclude;

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
    const record = await this.txHost.tx.product.findUnique({
      where: { id },
      include: WITH_VARIANTS,
    });
    return record ? ProductMapper.toDomain(record) : null;
  }

  async findBySlug(slug: string): Promise<Product | null> {
    const record = await this.txHost.tx.product.findUnique({
      where: { slug },
      include: WITH_VARIANTS,
    });
    return record ? ProductMapper.toDomain(record) : null;
  }

  // R5: deterministic order: created_at DESC, id DESC
  async list(params?: ListParams): Promise<Product[]> {
    const records = await this.txHost.tx.product.findMany({
      skip: params?.offset ?? 0,
      take: params?.limit ?? 20,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: WITH_VARIANTS,
    });
    return records.map((r) => ProductMapper.toDomain(r));
  }

  async count(): Promise<number> {
    return this.txHost.tx.product.count();
  }

  /**
   * Persists a product. New products are inserted together with their variants
   * (nested create, atomic). On update only the product's own columns change;
   * variants are added through addVariant().
   */
  async save(entity: Product): Promise<void> {
    const data = ProductMapper.toPersistence(entity);
    try {
      await this.txHost.tx.product.upsert({
        where: { id: entity.id },
        create: {
          ...data,
          variants: {
            create: entity.variants.map((v) =>
              ProductMapper.variantToNestedCreate(v),
            ),
          },
        },
        update: {
          name: data.name,
          slug: data.slug,
          categoryId: data.categoryId,
          description: data.description,
          isPublished: data.isPublished,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      throw this.translateUniqueViolation(error);
    }
  }

  async addVariant(variant: ProductVariant): Promise<void> {
    try {
      await this.txHost.tx.productVariant.create({
        data: ProductMapper.variantToPersistence(variant),
      });
    } catch (error) {
      throw this.translateUniqueViolation(error);
    }
  }

  // Prisma P2002 -> DuplicateEntityException (409); other errors pass through
  private translateUniqueViolation(error: unknown): unknown {
    const targets = uniqueViolationTargets(error);
    if (targets === null) {
      return error;
    }
    const field = targets.some((t) => t.includes('sku')) ? 'SKU' : 'slug';
    return new DuplicateEntityException(
      `A record with this ${field} already exists`,
    );
  }
}
