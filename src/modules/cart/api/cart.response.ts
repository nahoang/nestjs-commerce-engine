import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CartLineView, CartView } from '../application/cart-view';

export class CartLineResponse {
  @ApiProperty() id!: string;
  @ApiProperty() variant_id!: string;
  @ApiProperty({ nullable: true, type: String }) sku!: string | null;
  @ApiProperty({ nullable: true, type: String }) product_name!: string | null;
  @ApiProperty({ nullable: true, type: String }) variant_name!: string | null;
  @ApiProperty({ example: 2 }) quantity!: number;
  @ApiProperty({ nullable: true, type: String, example: '200000.00' })
  unit_price_amount!: string | null;
  @ApiProperty({ nullable: true, type: String, example: '400000.00' })
  line_total_amount!: string | null;
  @ApiProperty({ example: true }) is_available!: boolean;
  @ApiPropertyOptional({ nullable: true, type: String })
  reserved_until!: string | null;
}

export class CartResponse {
  @ApiProperty({ description: 'Secret that grants access to the cart' })
  token!: string;
  @ApiProperty({ example: 'vn-store' }) channel_slug!: string;
  @ApiProperty({ example: 'VND' }) currency!: string;
  @ApiProperty({ example: 'ACTIVE' }) status!: string;
  @ApiProperty({ type: [CartLineResponse] }) lines!: CartLineResponse[];
  @ApiProperty({ example: '400000.00' }) subtotal_amount!: string;
  @ApiProperty({ nullable: true, type: String }) voucher_code!: string | null;
  @ApiProperty({ example: '0.00' }) discount_amount!: string;
  @ApiProperty({ example: '400000.00' }) total_amount!: string;
}

function toLineResponse(line: CartLineView): CartLineResponse {
  return {
    id: line.id,
    variant_id: line.variantId,
    sku: line.sku,
    product_name: line.productName,
    variant_name: line.variantName,
    quantity: line.quantity,
    unit_price_amount: line.unitPrice?.amount.toFixed(2) ?? null,
    line_total_amount: line.lineTotal?.amount.toFixed(2) ?? null,
    is_available: line.isAvailable,
    reserved_until: line.reservedUntil?.toISOString() ?? null,
  };
}

export function toCartResponse(view: CartView): CartResponse {
  return {
    token: view.token,
    channel_slug: view.channelSlug,
    currency: view.currency,
    status: view.status,
    lines: view.lines.map(toLineResponse),
    subtotal_amount: view.subtotal.amount.toFixed(2),
    voucher_code: view.voucherCode,
    discount_amount: view.discount.amount.toFixed(2),
    total_amount: view.total.amount.toFixed(2),
  };
}

