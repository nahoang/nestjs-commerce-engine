import { registerDecorator, ValidationOptions } from 'class-validator';
import { InvalidValueException } from '../../domain/exceptions';

/** Parses a raw request value into a value object; throws InvalidValueException when invalid. */
export type ValueObjectParser = (value: unknown, field: string) => unknown;

function violation(
  parse: ValueObjectParser,
  value: unknown,
  field: string,
): string | null {
  try {
    parse(value, field);
    return null;
  } catch (error) {
    if (error instanceof InvalidValueException) {
      return error.message;
    }
    throw error;
  }
}

/**
 * class-validator constraint backed by a value object's own factory, so the
 * request layer and the domain can never disagree about what is valid.
 * Validation errors keep the property name (nested ones as `variants.0.sku`),
 * and the message is the one the value object produced.
 */
export function ValueObjectValid(
  parse: ValueObjectParser,
  options?: ValidationOptions,
): PropertyDecorator {
  return (target, propertyKey) => {
    const field = String(propertyKey);
    registerDecorator({
      name: 'valueObjectValid',
      target: target.constructor,
      propertyName: field,
      options,
      validator: {
        validate: (value: unknown) => violation(parse, value, field) === null,
        defaultMessage: (args) =>
          violation(parse, args?.value, field) ?? `${field} is invalid`,
      },
    });
  };
}
