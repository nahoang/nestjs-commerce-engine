import Decimal from 'decimal.js';
import {
  InvalidOperationException,
  InvalidValueException,
} from '../exceptions';
import { Money, parseCurrencyCode, parseMoneyAmount } from './money';

describe('Money — DOMAIN-SPEC-1-CATALOG § 1.5', () => {
  // Test case 1
  it('adds amounts of the same currency exactly', () => {
    const sum = Money.create('10.00', 'USD').add(Money.create('5.50', 'USD'));

    expect(sum.equals(Money.create('15.50', 'USD'))).toBe(true);
    expect(sum.toString()).toBe('15.50 USD');
  });

  it('keeps decimal precision where JS numbers would not (0.10 + 0.20)', () => {
    const sum = Money.create('0.10', 'USD').add(Money.create('0.20', 'USD'));
    expect(sum.amount.toFixed(2)).toBe('0.30');
  });

  it('rejects adding different currencies with InvalidOperationException', () => {
    expect(() =>
      Money.create('10.00', 'USD').add(Money.create('5.00', 'VND')),
    ).toThrow(InvalidOperationException);
  });

  // Test case 2
  it('rejects a negative amount', () => {
    expect(() => Money.create('-1', 'USD')).toThrow(InvalidValueException);
  });

  it('rejects more than 2 decimal places ("1.005")', () => {
    expect(() => Money.create('1.005', 'USD')).toThrow(InvalidValueException);
  });

  it.each(['', 'abc', '1e3', '+1', '.5', '1,5', '12345678901'])(
    'rejects the malformed amount %p',
    (amount) => {
      expect(() => Money.create(amount, 'USD')).toThrow(InvalidValueException);
    },
  );

  it('accepts the storage maximum 9999999999.99 and zero', () => {
    expect(Money.create('9999999999.99', 'USD').amount.toFixed(2)).toBe(
      '9999999999.99',
    );
    expect(Money.create('0', 'USD').amount.isZero()).toBe(true);
  });

  it('accepts a Decimal amount but rejects an invalid one', () => {
    expect(Money.create(new Decimal('2.5'), 'USD').toString()).toBe('2.50 USD');
    expect(() => Money.create(new Decimal('2.555'), 'USD')).toThrow(
      InvalidValueException,
    );
    expect(() => Money.create(new Decimal('-0.01'), 'USD')).toThrow(
      InvalidValueException,
    );
    expect(() => Money.create(new Decimal(NaN), 'USD')).toThrow(
      InvalidValueException,
    );
  });

  it('normalizes the currency to upper case and rejects bad codes', () => {
    expect(Money.create('1', ' vnd ').currency).toBe('VND');
    expect(() => Money.create('1', 'us')).toThrow(InvalidValueException);
    expect(() => Money.create('1', 'USDX')).toThrow(InvalidValueException);
    expect(() => Money.create('1', 'U1D')).toThrow(InvalidValueException);
  });

  it('reports the offending field name in the exception', () => {
    expect.assertions(3);
    try {
      parseMoneyAmount('-1', 'price_amount');
    } catch (error) {
      expect((error as InvalidValueException).field).toBe('price_amount');
      expect((error as InvalidValueException).errorCode).toBe(
        'VALIDATION_ERROR',
      );
    }
    expect(() => parseCurrencyCode('x', 'currency')).toThrow(
      InvalidValueException,
    );
  });

  it('multiplies by a whole quantity', () => {
    expect(Money.create('19.99', 'USD').multiply(3).toString()).toBe(
      '59.97 USD',
    );
    expect(Money.create('19.99', 'USD').multiply(0).amount.isZero()).toBe(true);
  });

  it.each([-1, 1.5, NaN])('rejects the quantity %p', (quantity) => {
    expect(() => Money.create('1', 'USD').multiply(quantity)).toThrow(
      InvalidOperationException,
    );
  });

  it('compares by value, not by identity', () => {
    expect(Money.create('1', 'USD').equals(Money.create('1.00', 'USD'))).toBe(
      true,
    );
    expect(Money.create('1', 'USD').equals(Money.create('1', 'VND'))).toBe(
      false,
    );
    expect(Money.create('1', 'USD').equals(Money.create('2', 'USD'))).toBe(
      false,
    );
    expect(Money.create('1', 'USD').equals(null)).toBe(false);
  });

  it('is immutable: operations return new instances', () => {
    const a = Money.create('1', 'USD');
    const b = a.add(Money.create('1', 'USD'));

    expect(a.amount.toFixed(2)).toBe('1.00');
    expect(b).not.toBe(a);
    expect(Object.isFrozen(a)).toBe(true);
  });
});
