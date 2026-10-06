import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { ProductVariant } from '../domain/product-variant.entity';
import { ProductRepository } from './product.repository';
import { EntityNotFoundException } from '../../../shared/domain/exceptions';
import { VariantCommand } from './create-product.use-case';

export interface AddVariantCommand extends VariantCommand {
  productId: string;
}

@Injectable()
export class AddVariantUseCase {
  constructor(private readonly productRepo: ProductRepository) {}

  @Transactional()
  async execute(command: AddVariantCommand): Promise<ProductVariant> {
    // Unknown product -> 404 ENTITY_NOT_FOUND
    const product = await this.productRepo.findById(command.productId);
    if (!product) {
      throw new EntityNotFoundException('Product', command.productId);
    }

    // R2 within the product; R1 (system-wide SKU) is enforced by the unique index
    const variant = product.addVariant(command);
    await this.productRepo.addVariant(variant);
    return variant;
  }
}
