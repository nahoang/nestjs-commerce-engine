import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { EntityNotFoundException } from '../../../shared/domain/exceptions';
import { CartRepository } from './cart.repository';
import { CartView, CartViewAssembler } from './cart-view';

export interface RemoveCartLineCommand {
  token: string;
  lineId: string;
}

@Injectable()
export class RemoveCartLineUseCase {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
    private readonly cartRepo: CartRepository,
    private readonly assembler: CartViewAssembler,
  ) {}

  async execute(command: RemoveCartLineCommand): Promise<CartView> {
    return this.txHost.withTransaction(async () => {
      const cart = await this.cartRepo.findByTokenForUpdate(command.token);
      if (!cart) {
        throw new EntityNotFoundException('Cart', command.token);
      }
      cart.removeItem(command.lineId);
      await this.cartRepo.save(cart);
      return this.assembler.assemble(cart);
    });
  }
}

