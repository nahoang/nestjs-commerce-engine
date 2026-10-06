import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { Category } from '../domain/category.entity';
import { Slug } from '../domain/slug';
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

    // R2: no slug supplied -> generate one from the name; a supplied slug must already be valid
    const suppliedSlug = command.slug?.trim();
    const finalSlug = suppliedSlug
      ? Slug.create(suppliedSlug)
      : Slug.fromName(trimmedName);

    // R1: slug is unique across all categories -> 409 DUPLICATE_ENTITY
    const existing = await this.categoryRepo.findBySlug(finalSlug.value);
    if (existing) {
      throw new DuplicateEntityException(
        `Category with slug '${finalSlug.value}' already exists`,
      );
    }

    // R3: parent_id (if given) must point to an existing category -> 404 ENTITY_NOT_FOUND
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
