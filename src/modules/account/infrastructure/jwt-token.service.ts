import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UnauthenticatedException } from '../../../shared/domain/exceptions';
import { AppConfigService } from '../../../shared/infrastructure/config/app-config.service';
import {
  IssuedToken,
  TokenClaims,
  TokenService,
} from '../application/token-service';
import { User } from '../domain/user.entity';

interface JwtPayload {
  sub?: unknown;
  tkey?: unknown;
}

/** HS256 JWT carrying `sub`, `tkey` and `exp` (R3). Nothing is stored server-side. */
@Injectable()
export class JwtTokenService extends TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
  ) {
    super();
  }

  async issue(user: User): Promise<IssuedToken> {
    const expiresIn = this.config.accessTokenExpireMinutes * 60;
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, tkey: user.tokenKey },
      { expiresIn },
    );
    return { accessToken, expiresIn };
  }

  async verify(token: string): Promise<TokenClaims> {
    let payload: JwtPayload;
    try {
      // Pinning the algorithm rejects "alg: none" and algorithm-confusion tokens
      payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        algorithms: ['HS256'],
      });
    } catch {
      throw new UnauthenticatedException();
    }
    if (typeof payload.sub !== 'string' || typeof payload.tkey !== 'string') {
      throw new UnauthenticatedException();
    }
    return { sub: payload.sub, tkey: payload.tkey };
  }
}
