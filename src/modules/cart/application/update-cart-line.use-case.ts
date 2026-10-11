import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { EntityNotFoundException } from '../../../shared/domain/exceptions';
import { CartRepository } from './cart.repository';
import { CartView, CartViewAssembler } from './cart-view';

export interface UpdateCartLineCommand {
  token: string;
  lineId: string;
  quantity: number;
}

@Injectable()
export class UpdateCartLineUseCase {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
    private readonly cartRepo: CartRepository,
    private readonly assembler: CartViewAssembler,
  ) {}

  async execute(command: UpdateCartLineCommand): Promise<CartView> {
    return this.txHost.withTransaction(async () => {
      const cart = await this.cartRepo.findByTokenForUpdate(command.token);
      if (!cart) {
        throw new EntityNotFoundException('Cart', command.token);
      }
      cart.updateQuantity(command.lineId, command.quantity);
      await this.cartRepo.save(cart);
      return this.assembler.assemble(cart);
    });
  }
}

