import { ListParams } from '../../../shared/application/repository';
import { Product } from '../domain/product.entity';
import { ProductVariant } from '../domain/product-variant.entity';

/**
 * Abstract class acting as both TypeScript interface and NestJS DI token for Product repository.
 * Pure application layer abstraction: no ORM or Prisma dependencies.
 */
export abstract class ProductRepository {
  abstract findById(id: string): Promise<Product | null>;
  abstract findBySlug(slug: string): Promise<Product | null>;
  abstract list(params?: ListParams): Promise<Product[]>;
  abstract count(): Promise<number>;
  /** Inserts a new product together with its variants (one atomic write). */
  abstract save(entity: Product): Promise<void>;
  /** Adds one variant to an existing product. Duplicate SKU -> DuplicateEntityException. */
  abstract addVariant(variant: ProductVariant): Promise<void>;
}
