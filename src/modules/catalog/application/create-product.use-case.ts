import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { Product } from '../domain/product.entity';
import { slugify } from '../domain/slugify';
import { ProductRepository } from './product.repository';
import { CategoryRepository } from './category.repository';
import {
  DuplicateEntityException,
  EntityNotFoundException,
} from '../../../shared/domain/exceptions';

export interface CreateProductCommand {
  name: string;
  slug?: string;
  categoryId?: string | null;
  description?: string | null;
  isPublished?: boolean;
}

@Injectable()
export class CreateProductUseCase {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly categoryRepo: CategoryRepository,
  ) {}

  @Transactional()
  async execute(command: CreateProductCommand): Promise<Product> {
    const trimmedName = command.name.trim();

    // R1: no slug supplied -> generate one from the name
    const finalSlug =
      command.slug && command.slug.trim().length > 0
        ? command.slug.trim()
        : slugify(trimmedName);

    // R1: slug is unique across all products -> 409 DUPLICATE_ENTITY
    const existing = await this.productRepo.findBySlug(finalSlug);
    if (existing) {
      throw new DuplicateEntityException(
        `Product with slug '${finalSlug}' already exists`,
      );
    }

    // R2: category_id (if given) must exist -> 404 ENTITY_NOT_FOUND
    if (command.categoryId) {
      const category = await this.categoryRepo.findById(command.categoryId);
      if (!category) {
        throw new EntityNotFoundException('Category', command.categoryId);
      }
    }

    // R3: new products default to draft
    const product = new Product({
      name: trimmedName,
      slug: finalSlug,
      categoryId: command.categoryId ?? null,
      description: command.description ?? null,
      isPublished: command.isPublished ?? false,
    });

    await this.productRepo.save(product);
    return product;
  }
}
