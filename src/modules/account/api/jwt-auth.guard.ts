import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { UnauthenticatedException } from '../../../shared/domain/exceptions';
import { TokenService } from '../application/token-service';
import { UserRepository } from '../application/user.repository';
import { User } from '../domain/user.entity';
import { IS_OPTIONAL_AUTH_KEY, IS_PUBLIC_KEY } from './auth-metadata';

export interface AuthenticatedRequest extends Request {
  /** Absent for anonymous callers on @Public() / @OptionalAuth() routes. */
  user?: User;
}

const BEARER_PATTERN = /^Bearer\s+(\S+)$/i;

/**
 * Global guard (APP_GUARD): every route requires a valid token unless it is
 * marked @Public() or @OptionalAuth().
 *
 * R4: a token is valid when the signature and expiry are valid, the user still
 * exists and is active, and the token's `tkey` equals the user's CURRENT token
 * key. The last check costs one DB read per request; it is what makes a
 * password change revoke older tokens.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
    private readonly users: UserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) {
      return true;
    }
    const optional = this.reflector.getAllAndOverride<boolean>(
      IS_OPTIONAL_AUTH_KEY,
      targets,
    );

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    if (optional && header === undefined) {
      return true;
    }

    const match = BEARER_PATTERN.exec(header ?? '');
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
