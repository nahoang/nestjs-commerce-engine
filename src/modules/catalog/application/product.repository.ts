import { ListParams } from '../../../shared/application/repository';
import { Product } from '../domain/product.entity';

/**
 * Abstract class acting as both TypeScript interface and NestJS DI token for Product repository.
 * Pure application layer abstraction: no ORM or Prisma dependencies.
 */
export abstract class ProductRepository {
  abstract findById(id: string): Promise<Product | null>;
  abstract findBySlug(slug: string): Promise<Product | null>;
  abstract list(params?: ListParams): Promise<Product[]>;
  abstract count(): Promise<number>;
  abstract save(entity: Product): Promise<void>;
}
