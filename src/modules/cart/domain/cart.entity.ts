import { BaseEntity } from '../../../shared/domain/base-entity';
import {
  EntityNotFoundException,
  InvalidOperationException,
} from '../../../shared/domain/exceptions';
import {
  Money,
  parseCurrencyCode,
} from '../../../shared/domain/value-objects/money';
import { CartLine } from './cart-line.entity';

export type CartStatus = 'ACTIVE' | 'ORDERED';

export interface PricedCartLine {
  lineId: string;
  variantId: string;
  quantity: number;
  /** false when the price map has no entry for the variant (R5). */
  isAvailable: boolean;
  unitPrice: Money | null;
  lineTotal: Money | null;
}

export interface CartPricing {
  lines: readonly PricedCartLine[];
  /** Sum of available lines only; zero money in the cart currency when none. */
  subtotal: Money;
}

export interface CartProps {
  id?: string;
  token: string;
  channelId: string;
  currency: string;
  userId?: string | null;
  status?: CartStatus;
  lines?: CartLine[];
  /** Per-line quantity ceiling (R2); injected so the domain never reads config. */
  maxLineQuantity: number;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Shopping cart aggregate root (DOMAIN-SPEC-3-CART § 3.1). One cart belongs to one
 * channel and therefore one currency. Lines are only reachable through the
 * behavior methods, and no price is stored: `price()` computes it from a map
 * supplied by the caller. Pure TypeScript.
 */
export class Cart extends BaseEntity {
  readonly token: string;
  readonly channelId: string;
  readonly currency: string;
  readonly userId: string | null;
  private _status: CartStatus;
  private readonly _lines: CartLine[];
  private readonly maxLineQuantity: number;

  constructor(props: CartProps) {
    super(props.id, props.createdAt, props.updatedAt);
    if (!Number.isInteger(props.maxLineQuantity) || props.maxLineQuantity < 1) {
      throw new InvalidOperationException(
        'Max line quantity must be a positive integer',
      );
    }
    this.token = props.token;
    this.channelId = props.channelId;
    this.currency = parseCurrencyCode(props.currency);
    this.userId = props.userId ?? null;
    this._status = props.status ?? 'ACTIVE';
    this._lines = [...(props.lines ?? [])];
    this.maxLineQuantity = props.maxLineQuantity;
  }

  get status(): CartStatus {
    return this._status;
  }

  get lines(): readonly CartLine[] {
    return [...this._lines];
  }

  /** R1 + R2: merges into the existing line of the variant; atomic on failure. */
  addItem(variantId: string, quantity: number): CartLine {
    this.assertActive();
    const existing = this._lines.find((l) => l.variantId === variantId);
    const target = (existing?.quantity ?? 0) + quantity;
    this.assertQuantity(target);
    if (existing) {
      existing.changeQuantity(target);
      this.touch();
      return existing;
    }
    const line = new CartLine({ variantId, quantity: target });
    this._lines.push(line);
    this.touch();
    return line;
  }

  /** R2 + R3: sets the quantity of an existing line. */
  updateQuantity(lineId: string, quantity: number): CartLine {
    this.assertActive();
    const line = this.findLine(lineId);
    this.assertQuantity(quantity);
    line.changeQuantity(quantity);
    this.touch();
    return line;
  }

  /** R3: removes an existing line. */
  removeItem(lineId: string): void {
    this.assertActive();
    const line = this.findLine(lineId);
    this._lines.splice(this._lines.indexOf(line), 1);
    this.touch();
  }

  /**
   * R5 + R6: prices the cart from `variantId -> Money`. Lines without a price are
   * flagged unavailable and excluded from the subtotal. A price in another currency
   * than the cart's is rejected.
   */
  price(prices: ReadonlyMap<string, Money>): CartPricing {
    let subtotal = Money.create('0', this.currency);
    const lines: PricedCartLine[] = this._lines.map((line) => {
      const unitPrice = prices.get(line.variantId);
      if (!unitPrice) {
        return {
          lineId: line.id,
          variantId: line.variantId,
          quantity: line.quantity,
          isAvailable: false,
          unitPrice: null,
          lineTotal: null,
        };
      }
      if (unitPrice.currency !== this.currency) {
        throw new InvalidOperationException(
          `Price currency ${unitPrice.currency} does not match cart currency ${this.currency}`,
        );
      }
      const lineTotal = unitPrice.multiply(line.quantity);
      subtotal = subtotal.add(lineTotal);
      return {
        lineId: line.id,
        variantId: line.variantId,
        quantity: line.quantity,
        isAvailable: true,
        unitPrice,
        lineTotal,
      };
    });
    return { lines, subtotal };
  }

  private findLine(lineId: string): CartLine {
    const line = this._lines.find((l) => l.id === lineId);
    if (!line) {
      throw new EntityNotFoundException('CartLine', lineId);
    }
    return line;
  }

  /** R4: an ORDERED cart is immutable. */
  private assertActive(): void {
    if (this._status !== 'ACTIVE') {
      throw new InvalidOperationException(
        `Cart is ${this._status} and can no longer be modified`,
      );
    }
  }

  private assertQuantity(quantity: number): void {
    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > this.maxLineQuantity
    ) {
      throw new InvalidOperationException(
        `Line quantity must be between 1 and ${this.maxLineQuantity}`,
      );
    }
  }
}
