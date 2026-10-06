import { Category as PrismaCategory, Prisma } from '@prisma/client';
import { Category } from '../domain/category.entity';
import { Slug } from '../domain/slug';

/**
 * Raw database row shape returned by raw SQL queries (WITH RECURSIVE).
 * Uses database column names (snake_case).
 */
export interface RawCategoryRow {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  is_active: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

/**
 * Mapper separating Prisma persistence model from Domain Category entity.
 */
export class CategoryMapper {
  static toDomain(record: PrismaCategory): Category {
    return new Category({
      id: record.id,
      name: record.name,
      slug: Slug.create(record.slug),
      parentId: record.parentId,
      isActive: record.isActive,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  static fromRawToDomain(row: RawCategoryRow): Category {
    return new Category({
      id: row.id,
      name: row.name,
      slug: Slug.create(row.slug),
      parentId: row.parent_id,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }

  static toPersistence(entity: Category): Prisma.CategoryUncheckedCreateInput {
    return {
      id: entity.id,
      name: entity.name,
      slug: entity.slug.value,
      parentId: entity.parentId,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
