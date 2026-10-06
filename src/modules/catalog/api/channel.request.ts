import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { IsCurrencyCode } from '../../../shared/api/validators/is-money-amount.decorator';
import { IsSlug } from './catalog-validators';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** Request payload for creating a Channel (snake_case per API-CONVENTIONS §2). */
export class CreateChannelRequest {
  @ApiProperty({
    description: 'Channel name (1..255 characters)',
    example: 'VN Store',
  })
  @Transform(trim)
  @IsNotEmpty({ message: 'name must not be empty' })
  @IsString({ message: 'name must be a string' })
  @Length(1, 255, { message: 'name length must be between 1 and 255' })
  name!: string;

  @ApiPropertyOptional({
    description: 'Custom slug; generated from the name when omitted',
    example: 'vn-store',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || undefined : value,
  )
  @IsOptional()
  @IsSlug()
  slug?: string;

  @ApiProperty({
    description: '3-letter ISO 4217 currency; fixed after creation',
    example: 'VND',
  })
  @IsCurrencyCode()
  currency!: string;

  @ApiPropertyOptional({
    description: 'Whether the channel is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'is_active must be a boolean' })
  is_active?: boolean;
}

/**
 * Payload for updating a Channel. There is no currency or slug field on purpose (R2):
 * the global ValidationPipe (whitelist) drops them if a client sends them.
 */
export class UpdateChannelRequest {
  @ApiPropertyOptional({
    description: 'New channel name (1..255 characters)',
    example: 'Vietnam Store',
  })
  @Transform(trim)
  @IsOptional()
  @IsNotEmpty({ message: 'name must not be empty' })
  @IsString({ message: 'name must be a string' })
  @Length(1, 255, { message: 'name length must be between 1 and 255' })
  name?: string;

  @ApiPropertyOptional({ description: 'Turn the channel on or off' })
  @IsOptional()
  @IsBoolean({ message: 'is_active must be a boolean' })
  is_active?: boolean;
}
