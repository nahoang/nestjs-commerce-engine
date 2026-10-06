import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { Matches } from 'class-validator';

// NUMERIC(12,2): up to 10 integer digits, at most 2 fraction digits, no sign/exponent
const MONEY_AMOUNT_PATTERN = /^\d{1,10}(\.\d{1,2})?$/;

/**
 * Validates a monetary amount sent as a decimal string (or a JSON number).
 * The value stays a string end to end; the application converts it with
 * `new Decimal(string)`, so no arithmetic ever happens on a JS number.
 * Numbers are only stringified (exponent forms such as 1e21 then fail the pattern).
 */
export function IsMoneyAmount(): PropertyDecorator {
  return applyDecorators(
    Transform(({ value }: { value: unknown }) => {
      if (typeof value === 'number') {
        return String(value);
      }
      return typeof value === 'string' ? value.trim() : value;
    }),
    Matches(MONEY_AMOUNT_PATTERN, {
      message:
        'amount must be a non-negative decimal with at most 2 decimal places',
    }),
  );
}
