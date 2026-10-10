import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { UnauthenticatedException } from '../../../shared/domain/exceptions';
import { TokenService } from '../application/token-service';
import { UserRepository } from '../application/user.repository';
import { User } from '../domain/user.entity';

export interface AuthenticatedRequest extends Request {
  user: User;
}

const BEARER_PATTERN = /^Bearer\s+(\S+)$/i;

/**
 * R4: a request is authenticated when the token signature and expiry are valid,
 * the user still exists and is active, and the token's `tkey` equals the user's
 * CURRENT token key. The last check costs one DB read per request; it is what
 * makes a password change revoke older tokens.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly tokens: TokenService,
    private readonly users: UserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const match = BEARER_PATTERN.exec(request.headers.authorization ?? '');
    if (!match) {
      throw new UnauthenticatedException();
    }

    const claims = await this.tokens.verify(match[1]);
    const user = await this.users.findById(claims.sub);
    if (!user || !user.isActive || user.tokenKey !== claims.tkey) {
      throw new UnauthenticatedException();
    }

    request.user = user;
    return true;
  }
}
