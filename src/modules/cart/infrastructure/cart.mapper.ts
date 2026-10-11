import { Cart as PrismaCart, CartLine as PrismaCartLine } from '@prisma/client';
import { Cart, CartStatus } from '../domain/cart.entity';
import { CartLine } from '../domain/cart-line.entity';

/** A cart row with its lines and its channel's currency (the cart has no currency column). */
export type CartRecord = PrismaCart & {
  lines: PrismaCartLine[];
  channel: { currency: string };
};

/** Separates the Prisma persistence model from the Cart aggregate. */
export class CartMapper {
  static toDomain(record: CartRecord, maxLineQuantity: number): Cart {
    return new Cart({
      id: record.id,
      token: record.token,
      channelId: record.channelId,
      currency: record.channel.currency,
      userId: record.userId,
      status: record.status as CartStatus,
      maxLineQuantity,
      lines: record.lines.map(
        (line) =>
          new CartLine({
            id: line.id,
            variantId: line.variantId,
            quantity: line.quantity,
            createdAt: line.createdAt,
            updatedAt: line.updatedAt,
          }),
      ),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}

