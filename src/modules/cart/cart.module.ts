import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/infrastructure/prisma/prisma.module';
import { CatalogModule } from '../catalog/catalog.module';
import { CartsController } from './api/carts.controller';
import { AddCartLineUseCase } from './application/add-cart-line.use-case';
import { CartRepository } from './application/cart.repository';
import { CartSettings } from './application/cart-settings';
import { CartViewAssembler } from './application/cart-view';
import { CreateCartUseCase } from './application/create-cart.use-case';
import { GetCartUseCase } from './application/get-cart.use-case';
import { RemoveCartLineUseCase } from './application/remove-cart-line.use-case';
import { UpdateCartLineUseCase } from './application/update-cart-line.use-case';
import { ConfigCartSettings } from './infrastructure/config-cart-settings';
import { PrismaCartRepository } from './infrastructure/prisma-cart.repository';

@Module({
  imports: [PrismaModule, CatalogModule],
  controllers: [CartsController],
  providers: [
    CartViewAssembler,
    CreateCartUseCase,
    GetCartUseCase,
    AddCartLineUseCase,
    UpdateCartLineUseCase,
    RemoveCartLineUseCase,
    { provide: CartRepository, useClass: PrismaCartRepository },
    { provide: CartSettings, useClass: ConfigCartSettings },
  ],
})
export class CartModule {}

