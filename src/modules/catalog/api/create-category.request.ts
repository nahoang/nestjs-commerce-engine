import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { IsSlug } from './catalog-validators';

/**
 * Request payload for creating a Category.
 * Follows API-CONVENTIONS §2: properties use snake_case (parent_id, is_active).
 */
export class CreateCategoryRequest {
  @ApiProperty({
    description: 'Category name (1..255 characters)',
    example: 'Thời trang',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsNotEmpty({ message: 'name must not be empty' })
  @IsString({ message: 'name must be a string' })
  @Length(1, 255, { message: 'name length must be between 1 and 255' })
  name!: string;

  @ApiPropertyOptional({
    description: 'Optional custom URL-friendly slug',
    example: 'thoi-trang',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || undefined : value,
  )
  @IsOptional()
  @IsSlug()
  slug?: string;

  @ApiPropertyOptional({
    description: 'Parent category ID for hierarchy tree',
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true,
  })
  @IsOptional()
  @IsString({ message: 'parent_id must be a string' })
  parent_id?: string | null;

  @ApiPropertyOptional({
    description: 'Whether the category is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'is_active must be a boolean' })
  is_active?: boolean;
}
