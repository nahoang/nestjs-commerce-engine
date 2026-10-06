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
import { AddVariantUseCase } from './application/add-variant.use-case';
import { PublishProductUseCase } from './application/publish-product.use-case';
import { UnpublishProductUseCase } from './application/unpublish-product.use-case';
import { GetProductUseCase } from './application/get-product.use-case';
import { SearchProductsUseCase } from './application/search-products.use-case';
import { ChannelsController } from './api/channels.controller';
import { ChannelRepository } from './application/channel.repository';
import { CreateChannelUseCase } from './application/create-channel.use-case';
import { GetChannelUseCase } from './application/get-channel.use-case';
import { ListChannelsUseCase } from './application/list-channels.use-case';
import { UpdateChannelUseCase } from './application/update-channel.use-case';
import { PrismaChannelRepository } from './infrastructure/prisma-channel.repository';
import { PrismaProductRepository } from './infrastructure/prisma-product.repository';

@Module({
  imports: [PrismaModule],
  controllers: [CategoriesController, ProductsController, ChannelsController],
  providers: [
    CreateProductUseCase,
    AddVariantUseCase,
    PublishProductUseCase,
    UnpublishProductUseCase,
    GetProductUseCase,
    SearchProductsUseCase,
    {
      provide: ProductRepository,
      useClass: PrismaProductRepository,
    },
    CreateChannelUseCase,
    GetChannelUseCase,
    ListChannelsUseCase,
    UpdateChannelUseCase,
    { provide: ChannelRepository, useClass: PrismaChannelRepository },
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
    ChannelRepository,
    CreateChannelUseCase,
    GetChannelUseCase,
    ListChannelsUseCase,
    UpdateChannelUseCase,
    ProductRepository,
    CreateProductUseCase,
    AddVariantUseCase,
    PublishProductUseCase,
    UnpublishProductUseCase,
    GetProductUseCase,
    SearchProductsUseCase,
    CategoryRepository,
    CreateCategoryUseCase,
    GetCategoryUseCase,
    ListCategoriesUseCase,
    GetCategoryTreeUseCase,
    GetBreadcrumbsUseCase,
  ],
})
export class CatalogModule {}
