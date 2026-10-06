import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { Product } from '../domain/product.entity';
import { ProductRepository } from './product.repository';
import { EntityNotFoundException } from '../../../shared/domain/exceptions';

@Injectable()
export class PublishProductUseCase {
  constructor(private readonly productRepo: ProductRepository) {}

  @Transactional()
  async execute(productId: string): Promise<Product> {
    const product = await this.productRepo.findByIdForUpdate(productId);
    if (!product) {
      throw new EntityNotFoundException('Product', productId);
    }

    // R3: the aggregate refuses to publish a product without variants -> 400
    product.publish();
    await this.productRepo.save(product);
    return product;
  }
}
