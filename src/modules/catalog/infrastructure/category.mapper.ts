import { Category as PrismaCategory, Prisma } from '@prisma/client';
import { Category } from '../domain/category.entity';

/**
 * Mapper separating Prisma persistence model from Domain Category entity.
 */
export class CategoryMapper {
  static toDomain(record: PrismaCategory): Category {
    return new Category({
      id: record.id,
      name: record.name,
      slug: record.slug,
      parentId: record.parentId,
      isActive: record.isActive,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  static toPersistence(entity: Category): Prisma.CategoryUncheckedCreateInput {
    return {
      id: entity.id,
      name: entity.name,
      slug: entity.slug,
      parentId: entity.parentId,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
