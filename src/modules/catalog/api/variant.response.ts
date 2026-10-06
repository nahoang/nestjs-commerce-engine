import { ApiProperty } from '@nestjs/swagger';
import { ProductVariant } from '../domain/product-variant.entity';

/**
 * Variant response shape. `price_amount` is a decimal string (never a JSON number).
 */
export class VariantResponse {
  @ApiProperty({ description: 'Variant identifier' })
  id!: string;

  @ApiProperty({ description: 'Owning product identifier' })
  product_id!: string;

  @ApiProperty({ example: 'TS-M' })
  sku!: string;

  @ApiProperty({ example: 'Size M' })
  name!: string;

  @ApiProperty({ description: 'Decimal string', example: '250000.00' })
  price_amount!: string;

  @ApiProperty({ example: 'VND' })
  currency!: string;

  @ApiProperty({ example: '2026-10-06T12:00:00.000Z' })
  created_at!: string;

  @ApiProperty({ example: '2026-10-06T12:00:00.000Z' })
  updated_at!: string;
}

export function toVariantResponse(variant: ProductVariant): VariantResponse {
  return {
    id: variant.id,
    product_id: variant.productId,
    sku: variant.sku.value,
    name: variant.name,
    price_amount: variant.price.amount.toFixed(2),
    currency: variant.price.currency,
    created_at: variant.createdAt.toISOString(),
    updated_at: variant.updatedAt.toISOString(),
  };
}
