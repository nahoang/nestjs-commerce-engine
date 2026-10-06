import { ApiProperty } from '@nestjs/swagger';
import { ChannelListing } from '../domain/channel-listing.entity';

export class ListingResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  variant_id!: string;

  @ApiProperty()
  channel_id!: string;

  @ApiProperty({ description: 'Decimal string', example: '250000.00' })
  price_amount!: string;

  @ApiProperty({ description: "The channel's currency", example: 'VND' })
  currency!: string;

  @ApiProperty({ example: true })
  is_available!: boolean;

  @ApiProperty({ example: '2026-10-06T12:00:00.000Z' })
  created_at!: string;

  @ApiProperty({ example: '2026-10-06T12:00:00.000Z' })
  updated_at!: string;
}

export function toListingResponse(listing: ChannelListing): ListingResponse {
  return {
    id: listing.id,
    variant_id: listing.variantId,
    channel_id: listing.channelId,
    price_amount: listing.price.amount.toFixed(2),
    currency: listing.price.currency,
    is_available: listing.isAvailable,
    created_at: listing.createdAt.toISOString(),
    updated_at: listing.updatedAt.toISOString(),
  };
}
