import { Money } from '../../../shared/domain/value-objects/money';
import {
  Product as PrismaProduct,
  ProductVariant as PrismaProductVariant,
  Prisma,
} from '@prisma/client';
import { Product } from '../domain/product.entity';
import { ProductVariant } from '../domain/product-variant.entity';
import { Sku } from '../domain/sku';
import { Slug } from '../domain/slug';

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
      slug: Slug.create(record.slug),
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
      sku: Sku.create(record.sku),
      name: record.name,
      // Via the exact decimal string, never through a JS number
      price: Money.create(record.priceAmount.toString(), record.currency),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  static toPersistence(entity: Product): Prisma.ProductUncheckedCreateInput {
    return {
      id: entity.id,
      name: entity.name,
      slug: entity.slug.value,
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
      sku: entity.sku.value,
      name: entity.name,
      priceAmount: entity.price.amount.toFixed(2),
      currency: entity.price.currency,
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
      sku: entity.sku.value,
      name: entity.name,
      priceAmount: entity.price.amount.toFixed(2),
      currency: entity.price.currency,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
