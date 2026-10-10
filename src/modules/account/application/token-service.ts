import { User } from '../domain/user.entity';

export interface IssuedToken {
  accessToken: string;
  /** Lifetime in seconds. */
  expiresIn: number;
}

export interface TokenClaims {
  /** User id. */
  sub: string;
  /** The user's token key at the time of issue. */
  tkey: string;
}

/** Port for signing and verifying access tokens; the format is an infrastructure choice. */
export abstract class TokenService {
  abstract issue(user: User): Promise<IssuedToken>;
  /** Throws UnauthenticatedException for any bad signature, shape or expiry. */
  abstract verify(token: string): Promise<TokenClaims>;
}
