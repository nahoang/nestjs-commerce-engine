import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/infrastructure/prisma/prisma.module';
import { CategoriesController } from './api/categories.controller';
import { CategoryRepository } from './application/category.repository';
import { CreateCategoryUseCase } from './application/create-category.use-case';
import { GetCategoryUseCase } from './application/get-category.use-case';
import { ListCategoriesUseCase } from './application/list-categories.use-case';
import { GetCategoryTreeUseCase } from './application/get-category-tree.use-case';
import { GetBreadcrumbsUseCase } from './application/get-breadcrumbs.use-case';
import { PrismaCategoryRepository } from './infrastructure/prisma-category.repository';
import { ProductsController } from './api/products.controller';
import { ProductRepository } from './application/product.repository';
import { CreateProductUseCase } from './application/create-product.use-case';
import { GetProductUseCase } from './application/get-product.use-case';
import { ListProductsUseCase } from './application/list-products.use-case';
import { PrismaProductRepository } from './infrastructure/prisma-product.repository';

@Module({
  imports: [PrismaModule],
  controllers: [CategoriesController, ProductsController],
  providers: [
    CreateProductUseCase,
    GetProductUseCase,
    ListProductsUseCase,
    {
      provide: ProductRepository,
      useClass: PrismaProductRepository,
    },
    CreateCategoryUseCase,
    GetCategoryUseCase,
    ListCategoriesUseCase,
    GetCategoryTreeUseCase,
    GetBreadcrumbsUseCase,
    {
      provide: CategoryRepository,
      useClass: PrismaCategoryRepository,
    },
  ],
  exports: [
    ProductRepository,
    CreateProductUseCase,
    GetProductUseCase,
    ListProductsUseCase,
    CategoryRepository,
    CreateCategoryUseCase,
    GetCategoryUseCase,
    ListCategoriesUseCase,
    GetCategoryTreeUseCase,
    GetBreadcrumbsUseCase,
  ],
})
export class CatalogModule {}
