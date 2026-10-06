import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Request payload for creating a Product.
 * Follows API-CONVENTIONS §2: properties use snake_case (category_id, is_published).
 */
export class CreateProductRequest {
  @ApiProperty({
    description: 'Product name (1..255 characters)',
    example: 'Áo Thun Cotton Nam',
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
    example: 'ao-thun-cotton-nam',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString({ message: 'slug must be a string' })
  @Length(1, 255, { message: 'slug length must be between 1 and 255' })
  slug?: string;

  @ApiPropertyOptional({
    description: 'Category ID the product belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true,
  })
  @IsOptional()
  @IsString({ message: 'category_id must be a string' })
  category_id?: string | null;

  @ApiPropertyOptional({
    description: 'Product description',
    nullable: true,
  })
  @IsOptional()
  @IsString({ message: 'description must be a string' })
  description?: string | null;

  @ApiPropertyOptional({
    description: 'Whether the product is published (defaults to draft)',
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'is_published must be a boolean' })
  is_published?: boolean;
}
