import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { IsMoneyAmount } from '../../../shared/api/validators/is-money-amount.decorator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/**
 * Request payload for one product variant (used both nested in CreateProductRequest
 * and as the body of POST /products/:productId/variants).
 */
export class VariantInput {
  @ApiProperty({ description: 'Globally unique SKU (1..100)', example: 'TS-M' })
  @Transform(trim)
  @IsNotEmpty({ message: 'sku must not be empty' })
  @IsString({ message: 'sku must be a string' })
  @Length(1, 100, { message: 'sku length must be between 1 and 100' })
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
    description: 'ISO 4217 currency code (normalized to upper case)',
    default: 'USD',
    example: 'VND',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsOptional()
  @Matches(/^[A-Z]{3}$/, {
    message: 'currency must be a 3-letter ISO 4217 code',
  })
  currency?: string;
}
