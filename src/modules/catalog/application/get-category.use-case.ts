import { Injectable } from '@nestjs/common';
import { Category } from '../domain/category.entity';
import { CategoryRepository } from './category.repository';
import { EntityNotFoundException } from '../../../shared/domain/exceptions';

@Injectable()
export class GetCategoryUseCase {
  constructor(private readonly categoryRepo: CategoryRepository) {}

  async execute(slugOrId: string): Promise<Category> {
    // Look up by slug first, then by id (DOMAIN-SPEC-1-CATALOG § 1.1)
    let category = await this.categoryRepo.findBySlug(slugOrId);
    if (!category) {
      category = await this.categoryRepo.findById(slugOrId);
    }

    if (!category) {
      throw new EntityNotFoundException('Category', slugOrId);
    }

    return category;
  }
}
