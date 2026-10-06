import Decimal from 'decimal.js';
import {
  Product as PrismaProduct,
  ProductVariant as PrismaProductVariant,
  Prisma,
} from '@prisma/client';
import { Product } from '../domain/product.entity';
import { ProductVariant } from '../domain/product-variant.entity';

export type PrismaProductWithVariants = PrismaProduct & {
  variants: PrismaProductVariant[];
};

/**
 * Mapper separating Prisma persistence models from Domain Product / ProductVariant entities.
 */
export class ProductMapper {
  static toDomain(record: PrismaProductWithVariants): Product {
    return new Product({
      id: record.id,
      name: record.name,
      slug: record.slug,
      categoryId: record.categoryId,
      description: record.description,
      isPublished: record.isPublished,
      variants: record.variants.map((v) => ProductMapper.variantToDomain(v)),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  static variantToDomain(record: PrismaProductVariant): ProductVariant {
    return new ProductVariant({
      id: record.id,
      productId: record.productId,
      sku: record.sku,
      name: record.name,
      // Via the exact decimal string, never through a JS number
      priceAmount: new Decimal(record.priceAmount.toString()),
      currency: record.currency,
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

  static variantToPersistence(
    entity: ProductVariant,
  ): Prisma.ProductVariantUncheckedCreateInput {
    return {
      id: entity.id,
      productId: entity.productId,
      sku: entity.sku,
      name: entity.name,
      priceAmount: entity.priceAmount.toFixed(2),
      currency: entity.currency,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  /** Variant payload for a nested create: the parent supplies product_id. */
  static variantToNestedCreate(
    entity: ProductVariant,
  ): Prisma.ProductVariantCreateWithoutProductInput {
    return {
      id: entity.id,
      sku: entity.sku,
      name: entity.name,
      priceAmount: entity.priceAmount.toFixed(2),
      currency: entity.currency,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
