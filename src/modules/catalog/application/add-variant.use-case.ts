import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { Money } from '../../../shared/domain/value-objects/money';
import {
  DEFAULT_CURRENCY,
  ProductVariant,
} from '../domain/product-variant.entity';
import { Sku } from '../domain/sku';
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
    // Unknown product -> 404 ENTITY_NOT_FOUND. The row lock serializes concurrent changes
    // to the aggregate, so rules that look at sibling variants (one currency per product)
    // are always checked against up-to-date data.
    const product = await this.productRepo.findByIdForUpdate(command.productId);
    if (!product) {
      throw new EntityNotFoundException('Product', command.productId);
    }

    // The aggregate enforces SKU uniqueness within the product (409) and one
    // currency per product (400); system-wide SKU uniqueness is the unique index
    const variant = product.addVariant({
      sku: Sku.create(command.sku),
      name: command.name,
      price: Money.create(
        command.priceAmount,
        command.currency ?? DEFAULT_CURRENCY,
      ),
    });
    await this.productRepo.addVariant(variant);
    return variant;
  }
}
