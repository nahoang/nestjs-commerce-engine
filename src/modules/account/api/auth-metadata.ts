import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '../domain/role';

export const IS_PUBLIC_KEY = 'auth:public';
export const IS_OPTIONAL_AUTH_KEY = 'auth:optional';
export const ROLES_KEY = 'auth:roles';

/**
 * Opts a route out of authentication. Authentication is required everywhere
 * else (global guard), so forgetting a decorator locks a route instead of opening it.
 */
export const Public = (): MethodDecorator & ClassDecorator =>
  SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Accepts both anonymous callers and authenticated users. Without an
 * Authorization header the caller is anonymous; a header that is present but
 * invalid is still rejected with 401 rather than silently downgraded.
 */
export const OptionalAuth = (): MethodDecorator & ClassDecorator =>
  applyDecorators(
    SetMetadata(IS_OPTIONAL_AUTH_KEY, true),
    ApiBearerAuth('JWT-auth'),
  );

/** Restricts a route to the listed roles. The role check is declared on the route (R2). */
export const Roles = (...roles: Role[]): MethodDecorator & ClassDecorator =>
  applyDecorators(SetMetadata(ROLES_KEY, roles), ApiBearerAuth('JWT-auth'));
