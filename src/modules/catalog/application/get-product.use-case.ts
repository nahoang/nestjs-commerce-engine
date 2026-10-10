import { Injectable } from '@nestjs/common';
import { Product } from '../domain/product.entity';
import { ProductRepository } from './product.repository';
import { EntityNotFoundException } from '../../../shared/domain/exceptions';
import { canSeeDrafts, Viewer } from './product-visibility';

@Injectable()
export class GetProductUseCase {
  constructor(private readonly productRepo: ProductRepository) {}

  async execute(slugOrId: string, viewer: Viewer): Promise<Product> {
    // Look up by slug first, then by id (DOMAIN-SPEC-1-CATALOG § 1.3)
    const product =
      (await this.productRepo.findBySlug(slugOrId)) ??
      (await this.productRepo.findById(slugOrId));

    // R3: a draft does not exist for viewers who may not see drafts
    if (!product || (!product.isPublished && !canSeeDrafts(viewer))) {
      throw new EntityNotFoundException('Product', slugOrId);
    }

    return product;
  }
}
