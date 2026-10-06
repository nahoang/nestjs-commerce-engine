import { BaseEntity } from '../../../shared/domain/base-entity';
import { InvalidValueException } from '../../../shared/domain/exceptions';
import { parseCurrencyCode } from '../../../shared/domain/value-objects/money';
import { Slug } from './slug';

export interface ChannelProps {
  id?: string;
  name: string;
  slug: Slug;
  /** Normalized with the Money rule (trim + upper case, 3 letters). */
  currency: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const MAX_NAME_LENGTH = 255;

function validName(raw: string): string {
  const name = typeof raw === 'string' ? raw.trim() : '';
  if (name.length === 0 || name.length > MAX_NAME_LENGTH) {
    throw new InvalidValueException(
      `name length must be between 1 and ${MAX_NAME_LENGTH}`,
      'name',
    );
  }
  return name;
}

/**
 * Sales channel (e.g. a regional store). Its currency is fixed at creation
 * (R2): there is no setter or behavior that changes it, because prices listed
 * on the channel are expressed in that currency. Pure TypeScript.
 */
export class Channel extends BaseEntity {
  private _name: string;
  private readonly _slug: Slug;
  private readonly _currency: string;
  private _isActive: boolean;

  constructor(props: ChannelProps) {
    super(props.id, props.createdAt, props.updatedAt);
    this._name = validName(props.name);
    this._slug = props.slug;
    this._currency = parseCurrencyCode(props.currency);
    // R3: a new channel is active unless rehydrated otherwise
    this._isActive = props.isActive ?? true;
  }

  get name(): string {
    return this._name;
  }

  get slug(): Slug {
    return this._slug;
  }

  get currency(): string {
    return this._currency;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  rename(name: string): void {
    const next = validName(name);
    if (next !== this._name) {
      this._name = next;
      this.touch();
    }
  }

  activate(): void {
    if (!this._isActive) {
      this._isActive = true;
      this.touch();
    }
  }

  deactivate(): void {
    if (this._isActive) {
      this._isActive = false;
      this.touch();
    }
  }
}
