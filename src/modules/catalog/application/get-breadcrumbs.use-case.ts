import { Injectable } from '@nestjs/common';
import { Category } from '../domain/category.entity';
import { CategoryRepository } from './category.repository';
import { EntityNotFoundException } from '../../../shared/domain/exceptions';

/**
 * Use case to retrieve breadcrumb trail from root down to the target category.
 * Resolves target category by slug first, then by ID.
 * Returns categories in root-to-leaf order.
 */
@Injectable()
export class GetBreadcrumbsUseCase {
  constructor(private readonly categoryRepo: CategoryRepository) {}

  async execute(slugOrId: string): Promise<Category[]> {
    const trimmed = slugOrId.trim();
    let category = await this.categoryRepo.findBySlug(trimmed);
    if (!category) {
      category = await this.categoryRepo.findById(trimmed);
    }

    if (!category) {
      throw new EntityNotFoundException('Category', trimmed);
    }

    return this.categoryRepo.getAncestors(category.id);
  }
}
