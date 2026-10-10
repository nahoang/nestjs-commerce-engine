import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/**
 * Request payload for registering an account (snake_case per API-CONVENTIONS §2).
 * There is no `role` field on purpose (R3): the global ValidationPipe
 * (whitelist) drops it if a client sends it.
 */
export class RegisterRequest {
  @ApiProperty({ example: 'lan@example.com' })
  @Transform(trim)
  @IsEmail({}, { message: 'email must be a valid email address' })
  @Length(1, 255, { message: 'email length must be at most 255' })
  email!: string;

  // Not trimmed: spaces are legitimate password characters
  @ApiProperty({
    description: '8..128 characters; stored only as a hash',
    example: 'correct-horse-battery',
  })
  @IsString({ message: 'password must be a string' })
  @Length(8, 128, { message: 'password length must be between 8 and 128' })
  password!: string;

  @ApiProperty({ example: 'Lan' })
  @Transform(trim)
  @IsNotEmpty({ message: 'first_name must not be empty' })
  @IsString({ message: 'first_name must be a string' })
  @Length(1, 100, { message: 'first_name length must be between 1 and 100' })
  first_name!: string;

  @ApiProperty({ example: 'Nguyen' })
  @Transform(trim)
  @IsNotEmpty({ message: 'last_name must not be empty' })
  @IsString({ message: 'last_name must be a string' })
  @Length(1, 100, { message: 'last_name length must be between 1 and 100' })
  last_name!: string;
}
