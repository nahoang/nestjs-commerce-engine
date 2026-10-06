export type ProductSortBy = 'newest' | 'price_asc' | 'price_desc' | 'name_asc';

/**
 * Plain search criteria for products (no framework types). All present criteria
 * are combined with AND. Prices are decimal strings; they are never turned into JS numbers.
 */
export interface ProductFilter {
  /** Case-insensitive "contains" match on name or description. */
  keyword?: string;
  /** Category ids to match: the chosen category plus all its descendants. */
  categoryIds?: string[];
  /** Inclusive bounds on the product price (lowest variant price in `currency`). */
  minPrice?: string;
  maxPrice?: string;
  /** Required whenever a price bound or a price sort is used. */
  currency?: string;
  isPublished?: boolean;
  sortBy: ProductSortBy;
}
