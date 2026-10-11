import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import {
  EntityNotFoundException,
  InvalidOperationException,
} from '../../../shared/domain/exceptions';
import { PricingQuery } from '../../catalog/application/pricing-query';
import { CartRepository } from './cart.repository';
import { CartView, CartViewAssembler } from './cart-view';

export interface AddCartLineCommand {
  token: string;
  variantId: string;
  quantity: number;
}

@Injectable()
export class AddCartLineUseCase {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
    private readonly cartRepo: CartRepository,
    private readonly pricingQuery: PricingQuery,
    private readonly assembler: CartViewAssembler,
  ) {}

  async execute(command: AddCartLineCommand): Promise<CartView> {
    return this.txHost.withTransaction(async () => {
      // Row lock: concurrent adds to one cart queue up instead of overwriting each other
      const cart = await this.cartRepo.findByTokenForUpdate(command.token);
      if (!cart) {
        throw new EntityNotFoundException('Cart', command.token);
      }

      // R3: unknown variant -> 404; known but not sellable on this channel -> 400
      if (!(await this.pricingQuery.variantExists(command.variantId))) {
        throw new EntityNotFoundException('ProductVariant', command.variantId);
      }
      const sellable = await this.pricingQuery.getChannelPrices(
        cart.channelId,
        [command.variantId],
      );
      if (!sellable.has(command.variantId)) {
        throw new InvalidOperationException(
          'Variant is not available on this channel',
        );
      }

      cart.addItem(command.variantId, command.quantity);
      await this.cartRepo.save(cart);
      return this.assembler.assemble(cart);
    });
  }
}

