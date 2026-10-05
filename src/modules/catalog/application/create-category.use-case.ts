import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { Category } from '../domain/category.entity';
import { slugify } from '../domain/slugify';
import { CategoryRepository } from './category.repository';
import {
  DuplicateEntityException,
  EntityNotFoundException,
} from '../../../shared/domain/exceptions';

export interface CreateCategoryCommand {
  name: string;
  slug?: string;
  parentId?: string | null;
  isActive?: boolean;
}

@Injectable()
export class CreateCategoryUseCase {
  constructor(private readonly categoryRepo: CategoryRepository) {}

  @Transactional()
  async execute(command: CreateCategoryCommand): Promise<Category> {
    const trimmedName = command.name.trim();

    // R2: Không truyền slug -> sinh tự động từ name. Có truyền -> trim
    const finalSlug =
      command.slug && command.slug.trim().length > 0
        ? command.slug.trim()
        : slugify(trimmedName);

    // R1: slug là duy nhất trên toàn bộ danh mục -> 409 DUPLICATE_ENTITY
    const existing = await this.categoryRepo.findBySlug(finalSlug);
    if (existing) {
      throw new DuplicateEntityException(
        `Category with slug '${finalSlug}' already exists`,
      );
    }

    // R3: parent_id (nếu có) phải trỏ tới danh mục tồn tại -> 404 ENTITY_NOT_FOUND
    if (command.parentId) {
      const parent = await this.categoryRepo.findById(command.parentId);
      if (!parent) {
        throw new EntityNotFoundException('Category', command.parentId);
      }
    }

    const category = new Category({
      name: trimmedName,
      slug: finalSlug,
      parentId: command.parentId ?? null,
      isActive: command.isActive ?? true,
    });

    await this.categoryRepo.save(category);
    return category;
  }
}
