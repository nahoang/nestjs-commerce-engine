/**
 * Read model of the channel storefront: plain, JSON-safe data (strings and numbers
 * only), so any cache store (memory or Redis) can hold it without losing class
 * instances. Prices are the channel's, never the variant's base price (R5).
 */
export interface StorefrontVariantView {
  id: string;
  productId: string;
  sku: string;
  name: string;
  /** Decimal string with 2 fraction digits, in the channel's currency. */
  priceAmount: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface StorefrontProductView {
  id: string;
  name: string;
  slug: string;
  categoryId: string | null;
  description: string | null;
  isPublished: boolean;
  variants: StorefrontVariantView[];
  createdAt: string;
  updatedAt: string;
}

export interface StorefrontPage {
  items: StorefrontProductView[];
  total: number;
}

export interface StorefrontChannel {
  id: string;
  currency: string;
}
