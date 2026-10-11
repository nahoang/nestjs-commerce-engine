import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { EntityNotFoundException } from '../../../shared/domain/exceptions';
import { ChannelRepository } from '../../catalog/application/channel.repository';
import { Cart } from '../domain/cart.entity';
import { CartRepository } from './cart.repository';
import { CartSettings } from './cart-settings';
import { CartView, CartViewAssembler } from './cart-view';

export interface CreateCartCommand {
  channelSlug: string;
  /** Set when the caller sent a valid Bearer token (R2). */
  userId?: string | null;
}

@Injectable()
export class CreateCartUseCase {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
    private readonly channelRepo: ChannelRepository,
    private readonly cartRepo: CartRepository,
    private readonly assembler: CartViewAssembler,
    private readonly settings: CartSettings,
  ) {}

  async execute(command: CreateCartCommand): Promise<CartView> {
    return this.txHost.withTransaction(async () => {
      // R1: only an ACTIVE channel can take a new cart
      const channel = await this.channelRepo.findBySlug(command.channelSlug);
      if (!channel || !channel.isActive) {
        throw new EntityNotFoundException('Channel', command.channelSlug);
      }
      const cart = new Cart({
        // R2: 256 random bits = 64 hex chars; whoever holds it controls the cart
        token: randomBytes(32).toString('hex'),
        channelId: channel.id,
        currency: channel.currency,
        userId: command.userId ?? null,
        maxLineQuantity: this.settings.maxLineQuantity,
      });
      await this.cartRepo.save(cart);
      return this.assembler.assemble(cart);
    });
  }
}
