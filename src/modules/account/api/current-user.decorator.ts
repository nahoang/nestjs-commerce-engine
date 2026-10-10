import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UnauthenticatedException } from '../../../shared/domain/exceptions';
import { User } from '../domain/user.entity';
import { AuthenticatedRequest } from './jwt-auth.guard';

/**
 * The authenticated user attached by JwtAuthGuard. Throws on a route that let
 * anonymous callers in; use `@CurrentUserOrNull()` there.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): User => {
    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!user) {
      throw new UnauthenticatedException();
    }
    return user;
  },
);

/** The user on an @OptionalAuth() route, or null for an anonymous caller. */
export const CurrentUserOrNull = createParamDecorator(
  (_data: unknown, context: ExecutionContext): User | null =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user ?? null,
);
