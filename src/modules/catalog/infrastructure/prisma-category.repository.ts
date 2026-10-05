import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { ListParams } from '../../../shared/application/repository';
import { Category } from '../domain/category.entity';
import { CategoryRepository } from '../application/category.repository';
import { CategoryMapper, RawCategoryRow } from './category.mapper';

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

  /**
   * Retrieves a category subtree (or entire tree if rootId is null) using a single Recursive CTE query.
   * Parameterized via Prisma tagged template $queryRaw to prevent SQL injection.
   */
  async getSubtree(rootId: string | null): Promise<Category[]> {
    const rows = await this.txHost.tx.$queryRaw<RawCategoryRow[]>`
      WITH RECURSIVE category_tree AS (
        SELECT id, name, slug, parent_id, is_active, created_at, updated_at
        FROM categories
        WHERE (${rootId}::text IS NULL AND parent_id IS NULL)
           OR id = ${rootId}
        UNION ALL
        SELECT c.id, c.name, c.slug, c.parent_id, c.is_active, c.created_at, c.updated_at
        FROM categories c
        JOIN category_tree ct ON c.parent_id = ct.id
      )
      SELECT id, name, slug, parent_id, is_active, created_at, updated_at
      FROM category_tree;
    `;
    return rows.map((r) => CategoryMapper.fromRawToDomain(r));
  }

  /**
   * Retrieves ordered breadcrumb trail from root down to target category using a single upward Recursive CTE query.
   * Sorts by depth DESC so root (highest depth) comes first, down to target leaf (depth 0).
   */
  async getAncestors(id: string): Promise<Category[]> {
    const rows = await this.txHost.tx.$queryRaw<RawCategoryRow[]>`
      WITH RECURSIVE category_breadcrumbs AS (
        SELECT id, name, slug, parent_id, is_active, created_at, updated_at, 0 AS depth
        FROM categories
        WHERE id = ${id}
        UNION ALL
        SELECT c.id, c.name, c.slug, c.parent_id, c.is_active, c.created_at, c.updated_at, cb.depth + 1 AS depth
        FROM categories c
        JOIN category_breadcrumbs cb ON c.id = cb.parent_id
      )
      SELECT id, name, slug, parent_id, is_active, created_at, updated_at
      FROM category_breadcrumbs
      ORDER BY depth DESC;
    `;
    return rows.map((r) => CategoryMapper.fromRawToDomain(r));
  }
}
