import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../domain/user.entity';
import { AuthenticatedRequest } from './jwt-auth.guard';

/** The user attached by JwtAuthGuard. Only valid on routes protected by that guard. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): User =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
