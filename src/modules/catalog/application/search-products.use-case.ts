import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { EntityNotFoundException } from '../../../shared/domain/exceptions';
import { ListParams } from '../../../shared/application/repository';
import { Product } from '../domain/product.entity';
import { CategoryRepository } from './category.repository';
import { ProductFilter, ProductSortBy } from './product-filter';
import { ProductRepository } from './product.repository';

export interface SearchProductsCommand {
  keyword?: string;
  categoryId?: string;
  minPrice?: string;
  maxPrice?: string;
  currency?: string;
  isPublished?: boolean;
  sortBy?: ProductSortBy;
}

export interface SearchProductsResult {
  items: Product[];
  total: number;
}

@Injectable()
export class SearchProductsUseCase {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly categoryRepo: CategoryRepository,
  ) {}

  // One read transaction so the page and the total see the same data
  @Transactional()
  async execute(
    command: SearchProductsCommand,
    page: ListParams,
  ): Promise<SearchProductsResult> {
    const filter: ProductFilter = {
      keyword: command.keyword,
      minPrice: command.minPrice,
      maxPrice: command.maxPrice,
      currency: command.currency,
      isPublished: command.isPublished,
      sortBy: command.sortBy ?? 'newest',
    };

    // R3: the category plus all descendants (recursive query of 1.2); unknown -> 404
    if (command.categoryId) {
      const subtree = await this.categoryRepo.getSubtree(command.categoryId);
      if (subtree.length === 0) {
        throw new EntityNotFoundException('Category', command.categoryId);
      }
      filter.categoryIds = subtree.map((category) => category.id);
    }

    return this.productRepo.search(filter, page);
  }
}
