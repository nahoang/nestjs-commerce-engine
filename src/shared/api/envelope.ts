import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Standard API response envelope for single resources or operation results.
 * Follows API-CONVENTIONS §2.
 */
export class ApiResponse<T> {
  @ApiProperty({ description: 'Response payload' })
  readonly data: T;

  @ApiProperty({
    description: 'Human-readable operation status message',
    example: 'success',
  })
  readonly message: string;

  constructor(data: T, message: string = 'success') {
    this.data = data;
    this.message = message;
  }
}

/**
 * Helper function to wrap data in standard ApiResponse envelope.
 */
export function ok<T>(data: T, message: string = 'success'): ApiResponse<T> {
  return new ApiResponse<T>(data, message);
}

/**
 * Standard API response envelope for paginated collections.
 * Follows API-CONVENTIONS §3.
 */
export class PaginatedResponse<T> {
  @ApiProperty({
    description: 'List of items in the current page',
    isArray: true,
  })
  readonly data: T[];

  @ApiProperty({
    description: 'Total number of items matching criteria',
    example: 100,
  })
  readonly total: number;

  @ApiProperty({ description: 'Current 1-based page index', example: 1 })
  readonly page: number;

  @ApiProperty({ description: 'Number of items per page (limit)', example: 20 })
  readonly page_size: number;

  @ApiProperty({
    description: 'Whether additional pages exist after this one',
    example: true,
  })
  readonly has_next: boolean;

  constructor(
    data: T[],
    total: number,
    page: number,
    pageSize: number,
    hasNext: boolean,
  ) {
    this.data = data;
    this.total = total;
    this.page = page;
    this.page_size = pageSize;
    this.has_next = hasNext;
  }
}

/**
 * Helper function to create PaginatedResponse with 1-based page and has_next calculation.
 * Follows API-CONVENTIONS §3:
 * - page = Math.floor(offset / limit) + 1
 * - has_next = (offset + limit) < total
 */
export function paginated<T>(
  items: T[],
  total: number,
  limit: number,
  offset: number,
): PaginatedResponse<T> {
  const safeLimit = limit > 0 ? limit : 20;
  const safeOffset = offset >= 0 ? offset : 0;
  const page = Math.floor(safeOffset / safeLimit) + 1;
  const hasNext = safeOffset + safeLimit < total;

  return new PaginatedResponse<T>(items, total, page, safeLimit, hasNext);
}

export interface ValidationErrorItem {
  field: string;
  message: string;
}

/**
 * Standard API error response envelope.
 * Follows API-CONVENTIONS §4.
 */
export class ErrorResponse {
  @ApiProperty({
    description: 'High-level error explanation',
    example: 'Request validation failed',
  })
  readonly detail: string;

  @ApiProperty({
    description: 'Machine-readable uppercase snake_case error code',
    example: 'VALIDATION_ERROR',
  })
  readonly error_code: string;

  @ApiPropertyOptional({
    description: 'Detailed list of field validation errors when applicable',
    example: [{ field: 'limit', message: 'limit must not be less than 1' }],
  })
  readonly errors?: ValidationErrorItem[];

  constructor(
    detail: string,
    errorCode: string,
    errors?: ValidationErrorItem[],
  ) {
    this.detail = detail;
    this.error_code = errorCode;
    if (errors && errors.length > 0) {
      this.errors = errors;
    }
  }
}
