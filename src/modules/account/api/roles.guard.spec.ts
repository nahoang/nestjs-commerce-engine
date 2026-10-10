import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PermissionDeniedException,
  UnauthenticatedException,
} from '../../../shared/domain/exceptions';
import { Email } from '../domain/email';
import { Role } from '../domain/role';
import { User } from '../domain/user.entity';
import { Roles } from './auth-metadata';
import { RolesGuard } from './roles.guard';

const userWith = (role: Role): User =>
  new User({
    email: Email.create('x@example.com'),
    passwordHash: 'h',
    firstName: 'X',
    lastName: 'Y',
    role,
    tokenKey: 'k',
  });

class Routes {
  @Roles('admin')
  adminOnly(): void {}

  @Roles('staff', 'admin')
  staffOrAdmin(): void {}

  anyone(): void {}
}

function contextFor(
  route: 'adminOnly' | 'staffOrAdmin' | 'anyone',
  user?: User,
): ExecutionContext {
  const handler = (Routes.prototype as unknown as Record<string, () => void>)[
    route
  ];
  return {
    getHandler: () => handler,
    getClass: () => Routes,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  const guard = new RolesGuard(new Reflector());

  it('lets any caller through a route without @Roles', () => {
    expect(guard.canActivate(contextFor('anyone'))).toBe(true);
  });

  it('allows a listed role', () => {
    expect(guard.canActivate(contextFor('adminOnly', userWith('admin')))).toBe(
      true,
    );
    expect(
      guard.canActivate(contextFor('staffOrAdmin', userWith('staff'))),
    ).toBe(true);
  });

  it('rejects an authenticated user whose role is not listed with 403', () => {
    expect(() =>
      guard.canActivate(contextFor('adminOnly', userWith('staff'))),
    ).toThrow(PermissionDeniedException);
    expect(() =>
      guard.canActivate(contextFor('staffOrAdmin', userWith('customer'))),
    ).toThrow(PermissionDeniedException);
  });

  it('fails closed with 401 when a @Roles route somehow has no user', () => {
    expect(() => guard.canActivate(contextFor('adminOnly'))).toThrow(
      UnauthenticatedException,
    );
  });
});
