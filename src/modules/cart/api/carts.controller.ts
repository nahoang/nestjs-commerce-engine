import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiTags,
  ApiResponse as SwaggerResponse,
} from '@nestjs/swagger';
import { ApiResponse, ok } from '../../../shared/api/envelope';
import { CurrentUserOrNull } from '../../account/api/current-user.decorator';
import { OptionalAuth, Public } from '../../account/api/auth-metadata';
import { User } from '../../account/domain/user.entity';
import { AddCartLineUseCase } from '../application/add-cart-line.use-case';
import { CreateCartUseCase } from '../application/create-cart.use-case';
import { GetCartUseCase } from '../application/get-cart.use-case';
import { RemoveCartLineUseCase } from '../application/remove-cart-line.use-case';
import { UpdateCartLineUseCase } from '../application/update-cart-line.use-case';
import {
  AddCartLineRequest,
  CreateCartRequest,
  UpdateCartLineRequest,
} from './cart.request';
import { CartResponse, toCartResponse } from './cart.response';

/**
 * Whoever holds the cart token controls the cart (R2), so only creating a cart looks at
 * the caller's identity; every other route is @Public().
 */
@ApiTags('Carts')
@Controller('api/v1/carts')
export class CartsController {
  constructor(
    private readonly createCart: CreateCartUseCase,
    private readonly getCart: GetCartUseCase,
    private readonly addCartLine: AddCartLineUseCase,
    private readonly updateCartLine: UpdateCartLineUseCase,
    private readonly removeCartLine: RemoveCartLineUseCase,
  ) {}

  // @OptionalAuth() alone: JwtAuthGuard returns early on @Public() BEFORE reading the
  // token, so adding @Public() here would stop user_id from ever being attached.
  @OptionalAuth()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a cart on a channel (Bearer optional)' })
  @ApiBody({ type: CreateCartRequest })
  @SwaggerResponse({ status: 201, type: CartResponse })
  async create(
    @Body() body: CreateCartRequest,
    @CurrentUserOrNull() user: User | null,
  ): Promise<ApiResponse<CartResponse>> {
    const view = await this.createCart.execute({
      channelSlug: body.channel_slug,
      userId: user?.id ?? null,
    });
    return ok(toCartResponse(view));
  }

  @Public()
  @Get(':token')
  @ApiOperation({ summary: 'Get a cart, priced from current channel listings' })
  @SwaggerResponse({ status: 200, type: CartResponse })
  async getOne(
    @Param('token') token: string,
  ): Promise<ApiResponse<CartResponse>> {
    return ok(toCartResponse(await this.getCart.execute(token)));
  }

  @Public()
  @Post(':token/lines')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add a variant (quantities merge per variant)' })
  @ApiBody({ type: AddCartLineRequest })
  @SwaggerResponse({ status: 200, type: CartResponse })
  async addLine(
    @Param('token') token: string,
    @Body() body: AddCartLineRequest,
  ): Promise<ApiResponse<CartResponse>> {
    const view = await this.addCartLine.execute({
      token,
      variantId: body.variant_id,
      quantity: body.quantity,
    });
    return ok(toCartResponse(view));
  }

  @Public()
  @Patch(':token/lines/:lineId')
  @ApiOperation({ summary: 'Set the quantity of a line' })
  @ApiBody({ type: UpdateCartLineRequest })
  @SwaggerResponse({ status: 200, type: CartResponse })
  async updateLine(
    @Param('token') token: string,
    @Param('lineId') lineId: string,
    @Body() body: UpdateCartLineRequest,
  ): Promise<ApiResponse<CartResponse>> {
    const view = await this.updateCartLine.execute({
      token,
      lineId,
      quantity: body.quantity,
    });
    return ok(toCartResponse(view));
  }

  @Public()
  @Delete(':token/lines/:lineId')
  @ApiOperation({ summary: 'Remove a line' })
  @SwaggerResponse({ status: 200, type: CartResponse })
  async removeLine(
    @Param('token') token: string,
    @Param('lineId') lineId: string,
  ): Promise<ApiResponse<CartResponse>> {
    const view = await this.removeCartLine.execute({ token, lineId });
    return ok(toCartResponse(view));
  }
}

