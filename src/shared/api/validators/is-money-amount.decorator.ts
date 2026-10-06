import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import {
  parseCurrencyCode,
  parseMoneyAmount,
} from '../../domain/value-objects/money';
import { ValueObjectValid } from './value-object.validator';

/**
 * Validates a monetary amount sent as a decimal string (or a JSON number) with the
 * same rules as the Money value object. The value stays a string end to end; the
 * domain converts it with `new Decimal(string)`, so no arithmetic ever happens on a
 * JS number. Numbers are only stringified (exponent forms such as 1e21 then fail).
 */
export function IsMoneyAmount(): PropertyDecorator {
  return applyDecorators(
    Transform(({ value }: { value: unknown }) => {
      if (typeof value === 'number') {
        return String(value);
      }
      return typeof value === 'string' ? value.trim() : value;
    }),
    ValueObjectValid(parseMoneyAmount),
  );
}

/** Validates a currency code with the Money value object's rule (trim + upper case, 3 letters). */
export function IsCurrencyCode(): PropertyDecorator {
  return ValueObjectValid(parseCurrencyCode);
}
