import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PermissionDeniedException,
  UnauthenticatedException,
} from '../../../shared/domain/exceptions';
import { Role } from '../domain/role';
import { ROLES_KEY } from './auth-metadata';
import { AuthenticatedRequest } from './jwt-auth.guard';

/**
 * Global guard (APP_GUARD), registered AFTER JwtAuthGuard so `request.user` is
 * already populated. Routes without @Roles() are open to any authenticated caller.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    // Reaching here without a user means @Roles was combined with @Public: fail closed
    if (!user) {
      throw new UnauthenticatedException();
    }
    if (!required.includes(user.role)) {
      throw new PermissionDeniedException();
    }
    return true;
  }
}
