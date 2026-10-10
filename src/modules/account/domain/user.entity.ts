import { BaseEntity } from '../../../shared/domain/base-entity';
import { InvalidValueException } from '../../../shared/domain/exceptions';
import { Email } from './email';
import { DEFAULT_ROLE, parseRole, Role } from './role';

export interface UserProps {
  id?: string;
  email: Email;
  /** Output of a PasswordHasher. The plain password never reaches the entity (R2). */
  passwordHash: string;
  firstName: string;
  lastName: string;
  role?: Role;
  isActive?: boolean;
  /** Random key embedded in access tokens; replacing it revokes every issued token (R3). */
  tokenKey: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const MAX_NAME_LENGTH = 100;

function validName(raw: string, field: string): string {
  const name = typeof raw === 'string' ? raw.trim() : '';
  if (name.length === 0 || name.length > MAX_NAME_LENGTH) {
    throw new InvalidValueException(
      `${field} length must be between 1 and ${MAX_NAME_LENGTH}`,
      field,
    );
  }
  return name;
}

function requiredText(raw: string, field: string): string {
  if (typeof raw !== 'string' || raw.length === 0) {
    throw new InvalidValueException(`${field} is required`, field);
  }
  return raw;
}

/**
 * Account identity and role. It holds only a password hash, never the plain
 * password, so there is nothing sensitive to leak through logging or mapping.
 */
export class User extends BaseEntity {
  private readonly _email: Email;
  private _passwordHash: string;
  private _firstName: string;
  private _lastName: string;
  private readonly _role: Role;
  private _isActive: boolean;
  private _tokenKey: string;

  constructor(props: UserProps) {
    super(props.id, props.createdAt, props.updatedAt);
    this._email = props.email;
    this._passwordHash = requiredText(props.passwordHash, 'passwordHash');
    this._firstName = validName(props.firstName, 'first_name');
    this._lastName = validName(props.lastName, 'last_name');
    // R4: customer unless a role is given explicitly (and it must be a known one)
    this._role = parseRole(props.role ?? DEFAULT_ROLE);
    this._isActive = props.isActive ?? true;
    this._tokenKey = requiredText(props.tokenKey, 'tokenKey');
  }

  get email(): Email {
    return this._email;
  }

  get passwordHash(): string {
    return this._passwordHash;
  }

  get firstName(): string {
    return this._firstName;
  }

  get lastName(): string {
    return this._lastName;
  }

  get role(): Role {
    return this._role;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get tokenKey(): string {
    return this._tokenKey;
  }
}
