import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
  registerDecorator,
  ValidationArguments,
} from 'class-validator';
import Decimal from 'decimal.js';
import { PaginationQueryDto } from '../../../shared/api/pagination.dto';
import { IsMoneyAmount } from '../../../shared/api/validators/is-money-amount.decorator';
import { ValueObjectValid } from '../../../shared/api/validators/value-object.validator';
import { InvalidValueException } from '../../../shared/domain/exceptions';
import { parseCurrencyCode } from '../../../shared/domain/value-objects/money';
import type { ProductSortBy } from '../application/product-filter';

const SORT_VALUES = ['newest', 'price_asc', 'price_desc', 'name_asc'] as const;

const toBoolean = ({ value }: { value: unknown }): unknown => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
};

const isBlank = (value: unknown): boolean =>
  value === undefined || value === '';

// R4: a price bound or a price sort is meaningless without a currency
function needsCurrency(dto: ListProductsQueryDto): boolean {
  return (
    dto.min_price !== undefined ||
    dto.max_price !== undefined ||
    dto.sort_by === 'price_asc' ||
    dto.sort_by === 'price_desc'
  );
}

/** R6: max_price must not be below min_price (checked only when both are valid amounts). */
function NotBelowMinPrice(): PropertyDecorator {
  return (target, propertyKey) => {
    registerDecorator({
      name: 'notBelowMinPrice',
      target: target.constructor,
      propertyName: String(propertyKey),
      validator: {
        validate: (value: unknown, args?: ValidationArguments) => {
          const min = (args?.object as ListProductsQueryDto).min_price;
          try {
            return new Decimal(String(value)).gte(new Decimal(String(min)));
          } catch {
            return true; // malformed amounts are reported by IsMoneyAmount
          }
        },
        defaultMessage: () => 'max_price must not be less than min_price',
      },
    });
  };
}

/**
 * Query parameters of GET /products: pagination plus the search filters of step 1.6.
 */
export class ListProductsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Case-insensitive text contained in the name or description',
    example: 'áo',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || undefined : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(255)
  keyword?: string;

  @ApiPropertyOptional({
    description:
      'Category id; products of its descendant categories are included',
  })
  @IsOptional()
  @IsString()
  category_id?: string;

  @ApiPropertyOptional({
    description:
      'Inclusive lower price bound (decimal string); requires currency',
    example: '100000',
  })
  @Transform(({ value }: { value: unknown }) =>
    isBlank(value) ? undefined : value,
  )
  @IsOptional()
  @IsMoneyAmount()
  min_price?: string;

  @ApiPropertyOptional({
    description:
      'Inclusive upper price bound (decimal string); requires currency',
    example: '300000',
  })
  @Transform(({ value }: { value: unknown }) =>
    isBlank(value) ? undefined : value,
  )
  @IsOptional()
  @IsMoneyAmount()
  @ValidateIf((o: ListProductsQueryDto) => o.min_price !== undefined, {
    always: false,
  })
  @NotBelowMinPrice()
  max_price?: string;

  @ApiPropertyOptional({
    description:
      'ISO 4217 code. Required with min_price, max_price or sort_by=price_*',
    example: 'VND',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() || undefined : value,
  )
  @ValidateIf(
    (o: ListProductsQueryDto) => needsCurrency(o) || o.currency !== undefined,
  )
  @ValueObjectValid((value, field) => {
    if (value === undefined) {
      throw new InvalidValueException(
        'currency is required when filtering or sorting by price',
        field,
      );
    }
    return parseCurrencyCode(value, field);
  })
  currency?: string;

  @ApiPropertyOptional({
    description: 'Filter by publication state; omit for no filter',
  })
  @Transform(toBoolean)
  @IsOptional()
  @IsBoolean()
  is_published?: boolean;

  @ApiPropertyOptional({ enum: SORT_VALUES, default: 'newest' })
  @IsOptional()
  @IsIn(SORT_VALUES)
  sort_by?: ProductSortBy;
}
