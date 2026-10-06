import { ApiProperty } from '@nestjs/swagger';
import { Product } from '../domain/product.entity';

/**
 * Standard Product response shape (snake_case per API-CONVENTIONS §2).
 */
export class ProductResponse {
  @ApiProperty({
    description: 'Unique product identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({ description: 'Product name', example: 'Áo Thun Cotton Nam' })
  name!: string;

  @ApiProperty({
    description: 'URL-friendly slug',
    example: 'ao-thun-cotton-nam',
  })
  slug!: string;

  @ApiProperty({ description: 'Category ID', nullable: true, example: null })
  category_id!: string | null;

  @ApiProperty({ description: 'Description', nullable: true, example: null })
  description!: string | null;

  @ApiProperty({ description: 'Published status', example: false })
  is_published!: boolean;

  @ApiProperty({
    description: 'Creation timestamp in ISO 8601 UTC format',
    example: '2026-10-06T12:00:00.000Z',
  })
  created_at!: string;

  @ApiProperty({
    description: 'Last update timestamp in ISO 8601 UTC format',
    example: '2026-10-06T12:00:00.000Z',
  })
  updated_at!: string;
}

/**
 * Maps Product domain entity to external API ProductResponse DTO.
 */
export function toProductResponse(product: Product): ProductResponse {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    category_id: product.categoryId,
    description: product.description,
    is_published: product.isPublished,
    created_at: product.createdAt.toISOString(),
    updated_at: product.updatedAt.toISOString(),
  };
}
