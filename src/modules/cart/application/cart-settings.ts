/**
 * Cart settings the application layer needs (DI token + contract). Implemented in
 * infrastructure on top of configuration, so use cases never read config themselves.
 */
export abstract class CartSettings {
  /** Max quantity of one variant in a cart (DOMAIN-SPEC-3-CART § 3.1 R2). */
  abstract readonly maxLineQuantity: number;
}

