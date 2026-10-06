import { ListParams } from '../../../shared/application/repository';
import { Product } from '../domain/product.entity';
import { ProductFilter } from './product-filter';
import { StorefrontChannel, StorefrontPage } from './storefront-view';
import { ProductVariant } from '../domain/product-variant.entity';

/**
 * Abstract class acting as both TypeScript interface and NestJS DI token for Product repository.
 * Pure application layer abstraction: no ORM or Prisma dependencies.
 */
export abstract class ProductRepository {
  abstract findById(id: string): Promise<Product | null>;
  /**
   * Loads the product (with variants) and holds a row lock until the surrounding
   * transaction ends, so concurrent changes to the same aggregate are serialized.
   * Must be called inside a transaction (use case `@Transactional()`).
   */
  abstract findByIdForUpdate(id: string): Promise<Product | null>;
  abstract findBySlug(slug: string): Promise<Product | null>;
  /** One page of products matching the filter, plus the total number of matches. */
  abstract search(
    filter: ProductFilter,
    params: ListParams,
  ): Promise<{ items: Product[]; total: number }>;
  /** Inserts a new product together with its variants (one atomic write). */
  abstract save(entity: Product): Promise<void>;
  /** Finds a variant by id across all products. */
  abstract findVariantById(id: string): Promise<ProductVariant | null>;
  /**
   * Storefront page of a channel: published products that have at least one available
   * listing there, each with only its available variants priced by the channel (R4, R5).
   * The number of queries does not depend on the number of products.
   */
  abstract listForChannel(
    channel: StorefrontChannel,
    params: ListParams,
  ): Promise<StorefrontPage>;
  /** Adds one variant to an existing product. Duplicate SKU -> DuplicateEntityException. */
  abstract addVariant(variant: ProductVariant): Promise<void>;
}
