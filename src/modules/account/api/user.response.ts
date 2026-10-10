import { ApiProperty } from '@nestjs/swagger';
import { User } from '../domain/user.entity';

/** Public view of a user: never carries the password hash or the token key (R4). */
export class UserResponse {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ example: 'lan@example.com' })
  email!: string;

  @ApiProperty({ example: 'Lan' })
  first_name!: string;

  @ApiProperty({ example: 'Nguyen' })
  last_name!: string;

  @ApiProperty({ enum: ['customer', 'staff', 'admin'], example: 'customer' })
  role!: string;

  @ApiProperty({ example: true })
  is_active!: boolean;

  @ApiProperty({ example: '2026-10-10T12:00:00.000Z' })
  created_at!: string;

  @ApiProperty({ example: '2026-10-10T12:00:00.000Z' })
  updated_at!: string;
}

export function toUserResponse(user: User): UserResponse {
  return {
    id: user.id,
    email: user.email.value,
    first_name: user.firstName,
    last_name: user.lastName,
    role: user.role,
    is_active: user.isActive,
    created_at: user.createdAt.toISOString(),
    updated_at: user.updatedAt.toISOString(),
  };
}
