import { Product as PrismaProduct, Prisma } from '@prisma/client';
import { Product } from '../domain/product.entity';

/**
 * Mapper separating Prisma persistence model from Domain Product entity.
 */
export class ProductMapper {
  static toDomain(record: PrismaProduct): Product {
    return new Product({
      id: record.id,
      name: record.name,
      slug: record.slug,
      categoryId: record.categoryId,
      description: record.description,
      isPublished: record.isPublished,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  static toPersistence(entity: Product): Prisma.ProductUncheckedCreateInput {
    return {
      id: entity.id,
      name: entity.name,
      slug: entity.slug,
      categoryId: entity.categoryId,
      description: entity.description,
      isPublished: entity.isPublished,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
