import { ApiProperty } from '@nestjs/swagger';
import { IssuedToken } from '../application/token-service';

export class TokenResponse {
  @ApiProperty({ description: 'Signed JWT to send as "Authorization: Bearer"' })
  access_token!: string;

  @ApiProperty({ example: 'bearer' })
  token_type!: 'bearer';

  @ApiProperty({ description: 'Lifetime in seconds', example: 1800 })
  expires_in!: number;
}

export function toTokenResponse(token: IssuedToken): TokenResponse {
  return {
    access_token: token.accessToken,
    token_type: 'bearer',
    expires_in: token.expiresIn,
  };
}
