import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { ListParams } from '../../../shared/application/repository';
import { Prisma } from '@prisma/client';
import { uniqueViolationTargets } from '../../../shared/infrastructure/prisma/prisma-errors';
import { DuplicateEntityException } from '../../../shared/domain/exceptions';
import { Product } from '../domain/product.entity';
import { ProductVariant } from '../domain/product-variant.entity';
import { ProductFilter } from '../application/product-filter';
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

  async findByIdForUpdate(id: string): Promise<Product | null> {
    // Lock first, then read: the read below sees every change committed before the lock was granted
    const locked = await this.txHost.tx.$queryRaw<
      Array<{ id: string }>
    >`SELECT id FROM products WHERE id = ${id} FOR UPDATE`;
    return locked.length > 0 ? this.findById(id) : null;
  }

  async findBySlug(slug: string): Promise<Product | null> {
    const record = await this.txHost.tx.product.findUnique({
      where: { slug },
      include: WITH_VARIANTS,
    });
    return record ? ProductMapper.toDomain(record) : null;
  }

  /**
   * Filtered, sorted page. Dynamic criteria are composed with Prisma.sql fragments, so every
   * value (keyword, ids, prices, currency, limit, offset) is a bound parameter; only fixed
   * SQL text is ever concatenated. Ids are selected first, then loaded with their variants.
   */
  async search(
    filter: ProductFilter,
    params: ListParams,
  ): Promise<{ items: Product[]; total: number }> {
    const usesPrice =
      filter.minPrice !== undefined ||
      filter.maxPrice !== undefined ||
      filter.sortBy === 'price_asc' ||
      filter.sortBy === 'price_desc';

    // R5: a product's price is its lowest variant price in the requested currency;
    // the inner join drops products with no variant in that currency
    const priceJoin =
      usesPrice && filter.currency !== undefined
        ? Prisma.sql`JOIN (
            SELECT product_id, MIN(price_amount) AS price
            FROM product_variants
            WHERE currency = ${filter.currency}
            GROUP BY product_id
          ) v ON v.product_id = p.id`
        : Prisma.empty;

    const conditions: Prisma.Sql[] = [];
    if (filter.keyword !== undefined) {
      // Escape LIKE wildcards so the keyword is matched literally
      const pattern = `%${filter.keyword.replace(/[\\%_]/g, '\\$&')}%`;
      conditions.push(
        Prisma.sql`(p.name ILIKE ${pattern} OR p.description ILIKE ${pattern})`,
      );
    }
    if (filter.categoryIds !== undefined) {
      conditions.push(
        Prisma.sql`p.category_id IN (${Prisma.join(filter.categoryIds)})`,
      );
    }
    if (filter.isPublished !== undefined) {
      conditions.push(Prisma.sql`p.is_published = ${filter.isPublished}`);
    }
    if (filter.minPrice !== undefined) {
      conditions.push(Prisma.sql`v.price >= ${filter.minPrice}::numeric`);
    }
    if (filter.maxPrice !== undefined) {
      conditions.push(Prisma.sql`v.price <= ${filter.maxPrice}::numeric`);
    }
    const where =
      conditions.length > 0
        ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
        : Prisma.empty;

    // id DESC / created_at DESC tie-breakers keep pages deterministic
    const orderBy = {
      newest: Prisma.sql`p.created_at DESC, p.id DESC`,
      name_asc: Prisma.sql`p.name ASC, p.id DESC`,
      price_asc: Prisma.sql`v.price ASC, p.created_at DESC, p.id DESC`,
      price_desc: Prisma.sql`v.price DESC, p.created_at DESC, p.id DESC`,
    }[filter.sortBy];

    const offset = params.offset ?? 0;
    const limit = params.limit ?? 20;

    const idRows = await this.txHost.tx.$queryRaw<Array<{ id: string }>>`
      SELECT p.id FROM products p ${priceJoin} ${where}
      ORDER BY ${orderBy} LIMIT ${limit} OFFSET ${offset}`;
    const countRows = await this.txHost.tx.$queryRaw<Array<{ total: bigint }>>`
      SELECT COUNT(*) AS total FROM products p ${priceJoin} ${where}`;
    const total = Number(countRows[0].total);

    const ids = idRows.map((row) => row.id);
    if (ids.length === 0) {
      return { items: [], total };
    }
    const records = await this.txHost.tx.product.findMany({
      where: { id: { in: ids } },
      include: WITH_VARIANTS,
    });
    const byId = new Map(records.map((r) => [r.id, r]));
    const items = ids.map((id) => ProductMapper.toDomain(byId.get(id)!));
    return { items, total };
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
          updatedAt: data.updatedAt,
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
