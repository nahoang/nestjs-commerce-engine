import {
  EntityNotFoundException,
  InvalidOperationException,
} from '../../../shared/domain/exceptions';
import { Money } from '../../../shared/domain/value-objects/money';
import { Cart, CartStatus } from './cart.entity';

const MAX = 50;
const vnd = (amount: string): Money => Money.create(amount, 'VND');

function makeCart(status?: CartStatus): Cart {
  return new Cart({
    token: 'tok',
    channelId: 'ch-1',
    currency: 'VND',
    status,
    maxLineQuantity: MAX,
  });
}

describe('Cart (DOMAIN-SPEC-3-CART § 3.1)', () => {
  const prices = new Map([['A', vnd('200000')]]);

  it('1. adds variant A x 2 -> subtotal 400000', () => {
    const cart = makeCart();
    cart.addItem('A', 2);
    expect(cart.price(prices).subtotal.equals(vnd('400000'))).toBe(true);
  });

  it('2. adding A again merges into one line (qty 3, subtotal 600000)', () => {
    const cart = makeCart();
    cart.addItem('A', 2);
    cart.addItem('A', 1);
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0].quantity).toBe(3);
    expect(cart.price(prices).subtotal.equals(vnd('600000'))).toBe(true);
  });

  it('3. update to 1 -> 200000; remove line -> empty, subtotal 0; unknown line -> not found', () => {
    const cart = makeCart();
    const line = cart.addItem('A', 3);
    cart.updateQuantity(line.id, 1);
    expect(cart.price(prices).subtotal.equals(vnd('200000'))).toBe(true);
    cart.removeItem(line.id);
    expect(cart.lines).toHaveLength(0);
    expect(cart.price(prices).subtotal.equals(vnd('0'))).toBe(true);
    expect(() => cart.removeItem(line.id)).toThrow(EntityNotFoundException);
    expect(() => cart.updateQuantity('nope', 1)).toThrow(
      EntityNotFoundException,
    );
  });

  it('4. adding 49 when holding 3 exceeds the max -> INVALID_OPERATION, cart unchanged', () => {
    const cart = makeCart();
    cart.addItem('A', 3);
    let error: unknown;
    try {
      cart.addItem('A', 49);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(InvalidOperationException);
    expect((error as InvalidOperationException).errorCode).toBe(
      'INVALID_OPERATION',
    );
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0].quantity).toBe(3);
  });

  it('5. variant missing from the price map is unavailable and excluded from subtotal', () => {
    const cart = makeCart();
    cart.addItem('A', 1);
    cart.addItem('B', 2);
    const pricing = cart.price(prices);
    expect(pricing.subtotal.equals(vnd('200000'))).toBe(true);
    const b = pricing.lines.find((l) => l.variantId === 'B');
    expect(b?.isAvailable).toBe(false);
    expect(pricing.lines.find((l) => l.variantId === 'A')?.isAvailable).toBe(
      true,
    );
  });

  it('6. an ORDERED cart rejects every modification', () => {
    const cart = makeCart('ORDERED');
    expect(() => cart.addItem('A', 1)).toThrow(InvalidOperationException);
    expect(() => cart.updateQuantity('x', 1)).toThrow(
      InvalidOperationException,
    );
    expect(() => cart.removeItem('x')).toThrow(InvalidOperationException);
  });

  it('R6: a price in another currency than the cart is rejected', () => {
    const cart = makeCart();
    cart.addItem('A', 1);
    const usd = new Map([['A', Money.create('1', 'USD')]]);
    expect(() => cart.price(usd)).toThrow(InvalidOperationException);
  });
});
