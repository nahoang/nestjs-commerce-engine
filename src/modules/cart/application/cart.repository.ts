import { Cart } from '../domain/cart.entity';

/** DI token and contract for Cart persistence (no ORM types). */
export abstract class CartRepository {
  abstract findByToken(token: string): Promise<Cart | null>;
  /**
   * Loads the cart (with lines) and holds a row lock until the surrounding transaction
   * ends, so two requests changing the same cart are serialized (no lost update).
   * Must be called inside a transaction.
   */
  abstract findByTokenForUpdate(token: string): Promise<Cart | null>;
  /** Writes the whole aggregate: the cart row, its lines, and removes dropped lines. */
  abstract save(cart: Cart): Promise<void>;
}

