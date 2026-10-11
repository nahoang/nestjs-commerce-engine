import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateCartRequest {
  @ApiProperty({
    description: 'Slug of an active channel',
    example: 'vn-store',
  })
  @IsNotEmpty({ message: 'channel_slug must not be empty' })
  @IsString({ message: 'channel_slug must be a string' })
  channel_slug!: string;
}

export class AddCartLineRequest {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsNotEmpty({ message: 'variant_id must not be empty' })
  @IsString({ message: 'variant_id must be a string' })
  variant_id!: string;

  @ApiProperty({ example: 2, description: 'Whole number >= 1' })
  @IsInt({ message: 'quantity must be an integer' })
  @Min(1, { message: 'quantity must be at least 1' })
  quantity!: number;
}

export class UpdateCartLineRequest {
  @ApiProperty({ example: 1, description: 'Whole number >= 1' })
  @IsInt({ message: 'quantity must be an integer' })
  @Min(1, { message: 'quantity must be at least 1' })
  quantity!: number;
}
