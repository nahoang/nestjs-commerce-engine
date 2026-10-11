import { Injectable } from '@nestjs/common';
import { EntityNotFoundException } from '../../../shared/domain/exceptions';
import { CartRepository } from './cart.repository';
import { CartView, CartViewAssembler } from './cart-view';

@Injectable()
export class GetCartUseCase {
  constructor(
    private readonly cartRepo: CartRepository,
    private readonly assembler: CartViewAssembler,
  ) {}

  async execute(token: string): Promise<CartView> {
    const cart = await this.cartRepo.findByToken(token);
    if (!cart) {
      throw new EntityNotFoundException('Cart', token);
    }
    return this.assembler.assemble(cart);
  }
}

