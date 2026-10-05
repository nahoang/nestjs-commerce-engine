import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Query parameters for category tree endpoint.
 */
export class CategoryTreeQueryDto {
  @ApiPropertyOptional({
    description:
      'Root category ID or slug to fetch subtree from. If omitted, returns entire tree.',
    name: 'root_id',
    example: 'do-nam',
  })
  @IsOptional()
  @IsString()
  root_id?: string;
}
