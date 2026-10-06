import { ApiProperty } from '@nestjs/swagger';
import { Channel } from '../domain/channel.entity';

export class ChannelResponse {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ example: 'VN Store' })
  name!: string;

  @ApiProperty({ example: 'vn-store' })
  slug!: string;

  @ApiProperty({ description: 'Fixed after creation', example: 'VND' })
  currency!: string;

  @ApiProperty({ example: true })
  is_active!: boolean;

  @ApiProperty({ example: '2026-10-06T12:00:00.000Z' })
  created_at!: string;

  @ApiProperty({ example: '2026-10-06T12:00:00.000Z' })
  updated_at!: string;
}

export function toChannelResponse(channel: Channel): ChannelResponse {
  return {
    id: channel.id,
    name: channel.name,
    slug: channel.slug.value,
    currency: channel.currency,
    is_active: channel.isActive,
    created_at: channel.createdAt.toISOString(),
    updated_at: channel.updatedAt.toISOString(),
  };
}
