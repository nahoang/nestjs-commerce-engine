import { Injectable } from '@nestjs/common';
import { ListParams } from '../../../shared/application/repository';
import { Category } from '../domain/category.entity';
import { CategoryRepository } from './category.repository';

export interface ListCategoriesResult {
  items: Category[];
  total: number;
}

@Injectable()
export class ListCategoriesUseCase {
  constructor(private readonly categoryRepo: CategoryRepository) {}

  async execute(params?: ListParams): Promise<ListCategoriesResult> {
    const [items, total] = await Promise.all([
      this.categoryRepo.list(params),
      this.categoryRepo.count(),
    ]);

    return { items, total };
  }
}
