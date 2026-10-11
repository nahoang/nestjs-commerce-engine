import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { AppConfigService } from '../../../shared/infrastructure/config/app-config.service';
import { CartRepository } from '../application/cart.repository';
import { Cart } from '../domain/cart.entity';
import { CartMapper } from './cart.mapper';

const WITH_LINES = {
  lines: { orderBy: [{ createdAt: 'asc' as const }, { id: 'asc' as const }] },
  channel: { select: { currency: true } },
};

@Injectable()
export class PrismaCartRepository implements CartRepository {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
    private readonly config: AppConfigService,
  ) {}

  async findByToken(token: string): Promise<Cart | null> {
    const record = await this.txHost.tx.cart.findUnique({
      where: { token },
      include: WITH_LINES,
    });
    return record
      ? CartMapper.toDomain(record, this.config.cartLineMaxQuantity)
      : null;
  }

  async findByTokenForUpdate(token: string): Promise<Cart | null> {
    // Lock first, then read: the read sees every change committed before the lock was granted
    const locked = await this.txHost.tx.$queryRaw<
      Array<{ id: string }>
    >`SELECT id FROM carts WHERE token = ${token} FOR UPDATE`;
    return locked.length > 0 ? this.findByToken(token) : null;
  }

  // Lines are upserted by id (UNIQUE cart_id+variant_id holds because the aggregate merges
  // duplicates, R1); lines no longer in the aggregate are deleted. The caller's transaction
  // makes the whole write atomic.
  async save(cart: Cart): Promise<void> {
    const tx = this.txHost.tx;
    await tx.cart.upsert({
      where: { id: cart.id },
      create: {
        id: cart.id,
        token: cart.token,
        channelId: cart.channelId,
        userId: cart.userId,
        status: cart.status,
        createdAt: cart.createdAt,
        updatedAt: cart.updatedAt,
      },
      update: { status: cart.status, updatedAt: cart.updatedAt },
    });
    await tx.cartLine.deleteMany({
      where: { cartId: cart.id, id: { notIn: cart.lines.map((l) => l.id) } },
    });
    for (const line of cart.lines) {
      await tx.cartLine.upsert({
        where: { id: line.id },
        create: {
          id: line.id,
          cartId: cart.id,
          variantId: line.variantId,
          quantity: line.quantity,
          createdAt: line.createdAt,
          updatedAt: line.updatedAt,
        },
        update: { quantity: line.quantity, updatedAt: line.updatedAt },
      });
    }
  }
}

