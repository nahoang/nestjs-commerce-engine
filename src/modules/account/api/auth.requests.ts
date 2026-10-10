import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class LoginRequest {
  @ApiProperty({ example: 'lan@example.com' })
  @Transform(trim)
  @IsEmail({}, { message: 'email must be a valid email address' })
  email!: string;

  // Only required to be present: a wrong or short password is a 401, not a 422 hint
  @ApiProperty({ example: 'correct-horse-battery' })
  @IsString({ message: 'password must be a string' })
  @IsNotEmpty({ message: 'password must not be empty' })
  password!: string;
}

export class ChangePasswordRequest {
  @ApiProperty({ example: 'correct-horse-battery' })
  @IsString({ message: 'current_password must be a string' })
  @IsNotEmpty({ message: 'current_password must not be empty' })
  current_password!: string;

  @ApiProperty({
    description: '8..128 characters; stored only as a hash',
    example: 'a-brand-new-passphrase',
  })
  @IsString({ message: 'new_password must be a string' })
  @Length(8, 128, { message: 'new_password length must be between 8 and 128' })
  new_password!: string;
}
