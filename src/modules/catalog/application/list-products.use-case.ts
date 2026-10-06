import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { ListParams } from '../../../shared/application/repository';
import { Product } from '../domain/product.entity';
import { ProductRepository } from './product.repository';

export interface ListProductsResult {
  items: Product[];
  total: number;
}

@Injectable()
export class ListProductsUseCase {
  constructor(private readonly productRepo: ProductRepository) {}

  // Read transaction so items and total are fetched on the same connection/boundary
  @Transactional()
  async execute(params?: ListParams): Promise<ListProductsResult> {
    const items = await this.productRepo.list(params);
    const total = await this.productRepo.count();
    return { items, total };
  }
}
