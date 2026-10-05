/**
 * Generic pagination and listing parameters for repository queries.
 */
export interface ListParams {
  limit?: number;
  offset?: number;
}

/**
 * Generic contract for Domain Repositories in Clean Architecture / DDD.
 *
 * Repositories represent an in-memory collection abstraction of domain entities/aggregates.
 * The domain/application layer depends on this abstraction, never on ORM/database details.
 */
export interface Repository<T> {
  /**
   * Finds an entity by its unique identifier.
   * Returns null if no entity matches the identifier.
   */
  findById(id: string): Promise<T | null>;

  /**
   * Retrieves a paginated list of entities.
   */
  list(params?: ListParams): Promise<T[]>;

  /**
   * Returns the total count of entities.
   */
  count(): Promise<number>;

  /**
   * Persists an entity (creates if new, updates if exists).
   */
  save(entity: T): Promise<void>;

  /**
   * Deletes an entity by its unique identifier.
   */
  delete(id: string): Promise<void>;
}
