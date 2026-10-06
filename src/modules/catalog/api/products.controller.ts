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
import { CreateProductUseCase } from '../application/create-product.use-case';
import { GetProductUseCase } from '../application/get-product.use-case';
import { ListProductsUseCase } from '../application/list-products.use-case';
import { CreateProductRequest } from './create-product.request';
import { ProductResponse, toProductResponse } from './product.response';

@ApiTags('Products')
@Controller('api/v1/products')
export class ProductsController {
  constructor(
    private readonly createProductUseCase: CreateProductUseCase,
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
    });

    return ok(toProductResponse(product));
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
