import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Common query DTO for offset-based pagination.
 * Follows API-CONVENTIONS §3.
 */
export class PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Maximum number of items to return in the page (1..100)',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must not be less than 1' })
  @Max(100, { message: 'limit must not be greater than 100' })
  limit: number = 20;

  @ApiPropertyOptional({
    description: 'Number of items to skip before returning results (>= 0)',
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'offset must be an integer' })
  @Min(0, { message: 'offset must not be less than 0' })
  offset: number = 0;
}
