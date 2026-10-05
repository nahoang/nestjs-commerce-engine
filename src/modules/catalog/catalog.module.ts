import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/infrastructure/prisma/prisma.module';
import { CategoriesController } from './api/categories.controller';
import { CategoryRepository } from './application/category.repository';
import { CreateCategoryUseCase } from './application/create-category.use-case';
import { GetCategoryUseCase } from './application/get-category.use-case';
import { ListCategoriesUseCase } from './application/list-categories.use-case';
import { PrismaCategoryRepository } from './infrastructure/prisma-category.repository';

@Module({
  imports: [PrismaModule],
  controllers: [CategoriesController],
  providers: [
    CreateCategoryUseCase,
    GetCategoryUseCase,
    ListCategoriesUseCase,
    {
      provide: CategoryRepository,
      useClass: PrismaCategoryRepository,
    },
  ],
  exports: [
    CategoryRepository,
    CreateCategoryUseCase,
    GetCategoryUseCase,
    ListCategoriesUseCase,
  ],
})
export class CatalogModule {}
