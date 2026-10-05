import { ListParams } from '../../../shared/application/repository';
import { Category } from '../domain/category.entity';

/**
 * Abstract class acting as both TypeScript interface and NestJS DI token for Category repository.
 * Pure application layer abstraction: no ORM or Prisma dependencies.
 */
export abstract class CategoryRepository {
  abstract findById(id: string): Promise<Category | null>;
  abstract findBySlug(slug: string): Promise<Category | null>;
  abstract list(params?: ListParams): Promise<Category[]>;
  abstract count(): Promise<number>;
  abstract save(entity: Category): Promise<void>;
  abstract getSubtree(rootId: string | null): Promise<Category[]>;
  abstract getAncestors(id: string): Promise<Category[]>;
}
