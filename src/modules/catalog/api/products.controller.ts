import Decimal from 'decimal.js';
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerResponse,
} from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../shared/api/pagination.dto';
import {
  ok,
  paginated,
  ApiResponse,
  PaginatedResponse,
} from '../../../shared/api/envelope';
import { AddVariantUseCase } from '../application/add-variant.use-case';
import { CreateProductUseCase } from '../application/create-product.use-case';
import { GetProductUseCase } from '../application/get-product.use-case';
import { ListProductsUseCase } from '../application/list-products.use-case';
import { CreateProductRequest } from './create-product.request';
import { VariantInput } from './variant-input';
import { VariantResponse, toVariantResponse } from './variant.response';
import { ProductResponse, toProductResponse } from './product.response';

// price_amount stays a validated decimal string until here; Decimal parses it exactly
function toVariantCommand(input: VariantInput): {
  sku: string;
  name: string;
  priceAmount: Decimal;
  currency?: string;
} {
  return {
    sku: input.sku,
    name: input.name,
    priceAmount: new Decimal(input.price_amount),
    currency: input.currency,
  };
}

@ApiTags('Products')
@Controller('api/v1/products')
export class ProductsController {
  constructor(
    private readonly createProductUseCase: CreateProductUseCase,
    private readonly addVariantUseCase: AddVariantUseCase,
    private readonly getProductUseCase: GetProductUseCase,
    private readonly listProductsUseCase: ListProductsUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a product (draft by default)' })
  @SwaggerResponse({
    status: 201,
    description: 'Product created successfully',
    type: ProductResponse,
  })
  async create(
    @Body() body: CreateProductRequest,
  ): Promise<ApiResponse<ProductResponse>> {
    const product = await this.createProductUseCase.execute({
      name: body.name,
      slug: body.slug,
      categoryId: body.category_id,
      description: body.description,
      isPublished: body.is_published,
      variants: body.variants?.map(toVariantCommand),
    });

    return ok(toProductResponse(product));
  }

  @Post(':productId/variants')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a variant to an existing product' })
  @SwaggerResponse({
    status: 201,
    description: 'Variant created successfully',
    type: VariantResponse,
  })
  async addVariant(
    @Param('productId') productId: string,
    @Body() body: VariantInput,
  ): Promise<ApiResponse<VariantResponse>> {
    const variant = await this.addVariantUseCase.execute({
      productId,
      ...toVariantCommand(body),
    });
    return ok(toVariantResponse(variant));
  }

  @Get()
  @ApiOperation({ summary: 'List products (offset pagination)' })
  @SwaggerResponse({
    status: 200,
    description: 'Paginated list of products',
  })
  async list(
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResponse<ProductResponse>> {
    const { items, total } = await this.listProductsUseCase.execute(query);
    return paginated(
      items.map(toProductResponse),
      total,
      query.limit,
      query.offset,
    );
  }

  @Get(':slugOrId')
  @ApiOperation({ summary: 'Get a product by slug or ID' })
  @SwaggerResponse({
    status: 200,
    description: 'Product details',
    type: ProductResponse,
  })
  async getOne(
    @Param('slugOrId') slugOrId: string,
  ): Promise<ApiResponse<ProductResponse>> {
    const product = await this.getProductUseCase.execute(slugOrId);
    return ok(toProductResponse(product));
  }
}
