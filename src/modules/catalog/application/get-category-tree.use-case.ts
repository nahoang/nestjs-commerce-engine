import { Injectable } from '@nestjs/common';
import { CategoryNode, buildTree } from '../domain/tree';
import { CategoryRepository } from './category.repository';
import { EntityNotFoundException } from '../../../shared/domain/exceptions';

/**
 * Use case to retrieve the nested category tree.
 * If rootIdOrSlug is provided, retrieves the subtree rooted at that category.
 * If omitted, retrieves the entire catalog tree.
 */
@Injectable()
export class GetCategoryTreeUseCase {
  constructor(private readonly categoryRepo: CategoryRepository) {}

  async execute(rootIdOrSlug?: string | null): Promise<CategoryNode[]> {
    let targetRootId: string | null = null;

    if (
      rootIdOrSlug !== undefined &&
      rootIdOrSlug !== null &&
      rootIdOrSlug.trim() !== ''
    ) {
      const trimmed = rootIdOrSlug.trim();
      let category = await this.categoryRepo.findBySlug(trimmed);
      if (!category) {
        category = await this.categoryRepo.findById(trimmed);
      }

      if (!category) {
        throw new EntityNotFoundException('Category', trimmed);
      }

      targetRootId = category.id;
    }

    const flat = await this.categoryRepo.getSubtree(targetRootId);
    return buildTree(flat);
  }
}
