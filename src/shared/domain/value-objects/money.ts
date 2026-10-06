import Decimal from 'decimal.js';
import {
  InvalidOperationException,
  InvalidValueException,
} from '../exceptions';

// NUMERIC(12,2) storage bound: up to 10 integer digits and 2 fraction digits
const AMOUNT_PATTERN = /^\d{1,10}(\.\d{1,2})?$/;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;
const amountMessage = (field: string): string =>
  `${field} must be a non-negative decimal with at most 10 integer digits and 2 decimal places`;
const currencyMessage = (field: string): string =>
  `${field} must be a 3-letter ISO 4217 code`;

/**
 * Parses a monetary amount. Strings are matched literally (no exponent, no sign,
 * no JS number round trip); a Decimal must be finite, non-negative and have at most
 * 2 decimal places. Throws InvalidValueException otherwise.
 */
export function parseMoneyAmount(
  raw: unknown,
  field: string = 'amount',
): Decimal {
  if (typeof raw === 'string') {
    if (!AMOUNT_PATTERN.test(raw)) {
      throw new InvalidValueException(amountMessage(field), field);
    }
    return new Decimal(raw);
  }
  if (
    raw instanceof Decimal &&
    raw.isFinite() &&
    !raw.isNegative() &&
    raw.decimalPlaces() <= 2 &&
    AMOUNT_PATTERN.test(raw.toFixed(2))
  ) {
    return raw;
  }
  throw new InvalidValueException(amountMessage(field), field);
}

/**
 * Normalizes (trim + upper case) and validates an ISO 4217-style currency code.
 */
export function parseCurrencyCode(
  raw: unknown,
  field: string = 'currency',
): string {
  const code = typeof raw === 'string' ? raw.trim().toUpperCase() : raw;
  if (typeof code !== 'string' || !CURRENCY_PATTERN.test(code)) {
    throw new InvalidValueException(currencyMessage(field), field);
  }
  return code;
}

/**
 * Immutable money value object: an exact non-negative amount with at most 2
 * decimal places in one currency. Compared by value. Pure TypeScript (decimal.js only).
 *
 * The amount is accepted as a string or Decimal, never a JS number, so a price can
 * not lose precision on the way in.
 */
export class Money {
  private constructor(
    readonly amount: Decimal,
    readonly currency: string,
  ) {
    Object.freeze(this);
  }

  static create(amount: string | Decimal, currency: string): Money {
    return new Money(parseMoneyAmount(amount), parseCurrencyCode(currency));
  }

  /** Adds two amounts of the same currency; different currencies are rejected. */
  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amount.plus(other.amount), this.currency);
  }

  /** Multiplies by a whole, non-negative quantity (e.g. order line quantity). */
  multiply(quantity: number): Money {
    if (!Number.isInteger(quantity) || quantity < 0) {
      throw new InvalidOperationException(
        'Quantity must be a non-negative integer',
      );
    }
    return new Money(this.amount.times(quantity), this.currency);
  }

  equals(other?: Money | null): boolean {
    return (
      other instanceof Money &&
      this.currency === other.currency &&
      this.amount.equals(other.amount)
    );
  }

  toString(): string {
    return `${this.amount.toFixed(2)} ${this.currency}`;
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new InvalidOperationException(
        `Cannot combine amounts in different currencies (${this.currency} and ${other.currency})`,
      );
    }
  }
}
