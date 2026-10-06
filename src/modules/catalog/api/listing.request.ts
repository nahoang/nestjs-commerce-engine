import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { IsMoneyAmount } from '../../../shared/api/validators/is-money-amount.decorator';

/**
 * Payload for listing a variant on a channel. There is no currency field on purpose (R2):
 * the listing is priced in the channel's currency, and a client-sent `currency` is dropped
 * by the global ValidationPipe (whitelist).
 */
export class CreateListingRequest {
  @ApiProperty({
    description: 'Variant to list',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty({ message: 'variant_id must not be empty' })
  @IsString({ message: 'variant_id must be a string' })
  variant_id!: string;

  @ApiProperty({
    description:
      'Price in the channel currency, decimal string (>= 0, at most 2 decimals)',
    example: '250000.00',
  })
  @IsMoneyAmount()
  price_amount!: string;

  @ApiPropertyOptional({
    description: 'Whether the storefront may sell it',
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'is_available must be a boolean' })
  is_available?: boolean;
}
