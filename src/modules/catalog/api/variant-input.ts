import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';
import { Transform } from 'class-transformer';
import {
  IsCurrencyCode,
  IsMoneyAmount,
} from '../../../shared/api/validators/is-money-amount.decorator';
import { IsSku } from './catalog-validators';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/**
 * Request payload for one product variant (used both nested in CreateProductRequest
 * and as the body of POST /products/:productId/variants).
 * sku, price_amount and currency are validated by the Sku and Money value objects.
 */
export class VariantInput {
  @ApiProperty({
    description:
      'Globally unique SKU, case-insensitive (stored upper-cased, 1..100 chars)',
    example: 'TS-M',
  })
  @Transform(trim)
  @IsSku()
  sku!: string;

  @ApiProperty({ description: 'Variant name (1..255)', example: 'Size M' })
  @Transform(trim)
  @IsNotEmpty({ message: 'name must not be empty' })
  @IsString({ message: 'name must be a string' })
  @Length(1, 255, { message: 'name length must be between 1 and 255' })
  name!: string;

  @ApiProperty({
    description: 'Price as a decimal string, >= 0, at most 2 decimal places',
    example: '250000.00',
  })
  @IsMoneyAmount()
  price_amount!: string;

  @ApiPropertyOptional({
    description:
      'ISO 4217 currency code (normalized to upper case); every variant of a product shares one currency',
    default: 'USD',
    example: 'VND',
  })
  @IsOptional()
  @IsCurrencyCode()
  currency?: string;
}
