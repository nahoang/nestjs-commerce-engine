import { InvalidValueException } from '../../../shared/domain/exceptions';
import { Email } from './email';
import { parseRole } from './role';
import { User, UserProps } from './user.entity';

const props = (overrides: Partial<UserProps> = {}): UserProps => ({
  email: Email.create('lan@example.com'),
  passwordHash: '$argon2id$stub',
  firstName: 'Lan',
  lastName: 'Nguyen',
  tokenKey: 'a'.repeat(64),
  ...overrides,
});

describe('User', () => {
  it('defaults to an active customer (R4)', () => {
    const user = new User(props());
    expect(user.role).toBe('customer');
    expect(user.isActive).toBe(true);
  });

  it('accepts staff and admin roles', () => {
    expect(new User(props({ role: 'staff' })).role).toBe('staff');
    expect(new User(props({ role: 'admin' })).role).toBe('admin');
  });

  it('rejects an unknown role', () => {
    expect(() => parseRole('superuser')).toThrow(InvalidValueException);
  });

  it('trims names and rejects blank ones', () => {
    expect(new User(props({ firstName: '  Lan ' })).firstName).toBe('Lan');
    expect(() => new User(props({ lastName: '   ' }))).toThrow(
      InvalidValueException,
    );
  });

  it('rejects an empty password hash or token key', () => {
    expect(() => new User(props({ passwordHash: '' }))).toThrow(
      InvalidValueException,
    );
    expect(() => new User(props({ tokenKey: '' }))).toThrow(
      InvalidValueException,
    );
  });
});
