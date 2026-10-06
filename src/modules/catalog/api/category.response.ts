import { ApiProperty } from '@nestjs/swagger';
import { Category } from '../domain/category.entity';
import { CategoryNode } from '../domain/tree';

/**
 * Standard Category response shape.
 * Follows API-CONVENTIONS §2: properties use snake_case (parent_id, is_active, created_at, updated_at).
 */
export class CategoryResponse {
  @ApiProperty({
    description: 'Unique category identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({ description: 'Category display name', example: 'Thời trang' })
  name!: string;

  @ApiProperty({ description: 'URL-friendly slug', example: 'thoi-trang' })
  slug!: string;

  @ApiProperty({
    description: 'Parent category ID',
    example: null,
    nullable: true,
  })
  parent_id!: string | null;

  @ApiProperty({ description: 'Active status', example: true })
  is_active!: boolean;

  @ApiProperty({
    description: 'Creation timestamp in ISO 8601 UTC format',
    example: '2026-10-05T12:00:00.000Z',
  })
  created_at!: string;

  @ApiProperty({
    description: 'Last update timestamp in ISO 8601 UTC format',
    example: '2026-10-05T12:00:00.000Z',
  })
  updated_at!: string;
}

/**
 * Hierarchical Category tree node response with nested children.
 */
export class CategoryNodeResponse extends CategoryResponse {
  @ApiProperty({
    description: 'Nested child category nodes',
    type: () => [CategoryNodeResponse],
  })
  children!: CategoryNodeResponse[];
}

/**
 * Maps Category domain entity to external API CategoryResponse DTO.
 */
export function toCategoryResponse(category: Category): CategoryResponse {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug.value,
    parent_id: category.parentId,
    is_active: category.isActive,
    created_at: category.createdAt.toISOString(),
    updated_at: category.updatedAt.toISOString(),
  };
}

/**
 * Maps CategoryNode domain entity to external API CategoryNodeResponse DTO.
 */
export function toCategoryNodeResponse(
  node: CategoryNode,
): CategoryNodeResponse {
  return {
    ...toCategoryResponse(node.category),
    children: node.children.map(toCategoryNodeResponse),
  };
}
