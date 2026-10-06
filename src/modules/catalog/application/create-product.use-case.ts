import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { Money } from '../../../shared/domain/value-objects/money';
import { Product } from '../domain/product.entity';
import { DEFAULT_CURRENCY } from '../domain/product-variant.entity';
import { Sku } from '../domain/sku';
import { Slug } from '../domain/slug';
import { ProductRepository } from './product.repository';
import { CategoryRepository } from './category.repository';
import {
  DuplicateEntityException,
  EntityNotFoundException,
} from '../../../shared/domain/exceptions';

/** Raw variant input; the value objects (Sku, Money) are built and validated here. */
export interface VariantCommand {
  sku: string;
  name: string;
  priceAmount: string;
  currency?: string;
}

export interface CreateProductCommand {
  name: string;
  slug?: string;
  categoryId?: string | null;
  description?: string | null;
  isPublished?: boolean;
  variants?: VariantCommand[];
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

    // R1: no slug supplied -> generate one from the name; a supplied slug must already be valid
    const suppliedSlug = command.slug?.trim();
    const finalSlug = suppliedSlug
      ? Slug.create(suppliedSlug)
      : Slug.fromName(trimmedName);

    // Slug is unique across all products -> 409 DUPLICATE_ENTITY
    const existing = await this.productRepo.findBySlug(finalSlug.value);
    if (existing) {
      throw new DuplicateEntityException(
        `Product with slug '${finalSlug.value}' already exists`,
      );
    }

    // category_id (if given) must exist -> 404 ENTITY_NOT_FOUND
    if (command.categoryId) {
      const category = await this.categoryRepo.findById(command.categoryId);
      if (!category) {
        throw new EntityNotFoundException('Category', command.categoryId);
      }
    }

    // New products are drafts; publication goes through the aggregate (rule R3)
    const product = new Product({
      name: trimmedName,
      slug: finalSlug,
      categoryId: command.categoryId ?? null,
      description: command.description ?? null,
    });

    // The aggregate enforces unique SKUs (409) and a single currency (400)
    command.variants?.forEach((variant, index) => {
      product.addVariant({
        sku: Sku.create(variant.sku, `variants.${index}.sku`),
        name: variant.name,
        price: Money.create(
          variant.priceAmount,
          variant.currency ?? DEFAULT_CURRENCY,
        ),
      });
    });

    if (command.isPublished) {
      product.publish();
    }

    // One transaction for the product and all its variants (R7 of 1.4)
    await this.productRepo.save(product);
    return product;
  }
}
