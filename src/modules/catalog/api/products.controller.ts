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
  ApiBody,
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerResponse,
} from '@nestjs/swagger';
import {
  ok,
  paginated,
  ApiResponse,
  PaginatedResponse,
} from '../../../shared/api/envelope';
import { AddVariantUseCase } from '../application/add-variant.use-case';
import { CreateProductUseCase } from '../application/create-product.use-case';
import { PublishProductUseCase } from '../application/publish-product.use-case';
import { UnpublishProductUseCase } from '../application/unpublish-product.use-case';
import { GetProductUseCase } from '../application/get-product.use-case';
import { SearchProductsUseCase } from '../application/search-products.use-case';
import { ListProductsQueryDto } from './list-products-query.dto';
import { CreateProductRequest } from './create-product.request';
import { VariantInput } from './variant-input';
import { VariantResponse, toVariantResponse } from './variant.response';
import { ProductResponse, toProductResponse } from './product.response';
import { OptionalAuth, Roles } from '../../account/api/auth-metadata';
import { CurrentUserOrNull } from '../../account/api/current-user.decorator';
import { User } from '../../account/domain/user.entity';

// The controller only maps the DTO to a command; Sku and Money are built in the use case
function toVariantCommand(input: VariantInput): {
  sku: string;
  name: string;
  priceAmount: string;
  currency?: string;
} {
  return {
    sku: input.sku,
    name: input.name,
    priceAmount: input.price_amount,
    currency: input.currency,
  };
}

// Ready-to-run scenarios for the Swagger "Examples" dropdown (see WIP step log, section 1.9.5)
const CREATE_PRODUCT_EXAMPLES = {
  A_success_with_variants: {
    summary: 'A. Product with two variants (number price, lower-case currency)',
    value: {
      name: 'Ao Thun Cotton',
      variants: [
        { sku: 'TS-M', name: 'M', price_amount: '250000.00' },
        { sku: 'TS-XL', name: 'XL', price_amount: 275000.5, currency: 'usd' },
      ],
    },
  },
  A0_other_product: {
    summary: 'Product without variants (use before scenario D)',
    value: { name: 'Other product' },
  },
  E_duplicate_sku_in_payload: {
    summary: 'E. Same SKU twice in one payload -> 409, nothing created',
    value: {
      name: 'Dup',
      variants: [
        { sku: 'D-1', name: 'A', price_amount: '1' },
        { sku: 'D-1', name: 'B', price_amount: '2' },
      ],
    },
  },
  I_invalid_slug: {
    summary: 'I. Slug with capitals and a space -> 422 on field slug',
    value: { name: 'Ao Thun', slug: 'Ao Thun' },
  },
  M_publish_without_variants: {
    summary: 'M. is_published=true without variants -> 400 INVALID_OPERATION',
    value: { name: 'Draft only', is_published: true },
  },
  F_negative_price: {
    summary: 'F. Negative price -> 422, no SQL',
    value: {
      name: 'Negative',
      variants: [{ sku: 'N-1', name: 'A', price_amount: '-1' }],
    },
  },
};

const ADD_VARIANT_EXAMPLES = {
  C_add_variant: {
    summary: 'C. Add a variant to an existing product',
    value: { sku: 'TS-L', name: 'L', price_amount: '19.9' },
  },
  D_sku_of_another_product: {
    summary: 'D. SKU already used by another product -> 409',
    value: { sku: 'TS-M', name: 'Duplicate', price_amount: '1' },
  },
  F_negative_price: {
    summary: 'F. Negative price -> 422, no SQL',
    value: { sku: 'TS-N', name: 'N', price_amount: '-1' },
  },
  J_lowercase_duplicate_sku: {
    summary: 'J. "ts-m" when TS-M exists -> 409 (SKUs ignore case)',
    value: { sku: 'ts-m', name: 'Lower case', price_amount: '1' },
  },
  K_other_currency: {
    summary: 'K. VND variant on a product priced in USD -> 400',
    value: { sku: 'TS-VND', name: 'VND', price_amount: '1', currency: 'VND' },
  },
  G_bad_currency: {
    summary: 'G. Invalid currency -> 422 (change "us" to "usd" for 201)',
    value: { sku: 'TS-C', name: 'C', price_amount: '1', currency: 'us' },
  },
  H_unknown_product: {
    summary: 'H. Use productId 00000000-0000-0000-0000-000000000000 -> 404',
    value: { sku: 'X-1', name: 'X', price_amount: '1' },
  },
};

@ApiTags('Products')
@Controller('api/v1/products')
export class ProductsController {
  constructor(
    private readonly createProductUseCase: CreateProductUseCase,
    private readonly addVariantUseCase: AddVariantUseCase,
    private readonly publishProductUseCase: PublishProductUseCase,
    private readonly unpublishProductUseCase: UnpublishProductUseCase,
    private readonly getProductUseCase: GetProductUseCase,
    private readonly searchProductsUseCase: SearchProductsUseCase,
  ) {}

  @Roles('admin')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a product (draft by default)' })
  @ApiBody({ type: CreateProductRequest, examples: CREATE_PRODUCT_EXAMPLES })
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

  @Roles('admin')
  @Post(':productId/variants')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a variant to an existing product' })
  @ApiBody({ type: VariantInput, examples: ADD_VARIANT_EXAMPLES })
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

  @Roles('admin')
  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Publish a product (requires at least one variant)',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Product published',
    type: ProductResponse,
  })
  async publish(
    @Param('id') id: string,
  ): Promise<ApiResponse<ProductResponse>> {
    const product = await this.publishProductUseCase.execute(id);
    return ok(toProductResponse(product));
  }

  @Roles('admin')
  @Post(':id/unpublish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Return a product to draft' })
  @SwaggerResponse({
    status: 200,
    description: 'Product unpublished',
    type: ProductResponse,
  })
  async unpublish(
    @Param('id') id: string,
  ): Promise<ApiResponse<ProductResponse>> {
    const product = await this.unpublishProductUseCase.execute(id);
    return ok(toProductResponse(product));
  }

  @OptionalAuth()
  @Get()
  @ApiOperation({
    summary: 'List and search products (filters, sorting, offset pagination)',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Paginated list of products matching all given filters',
  })
  async list(
    @Query() query: ListProductsQueryDto,
    @CurrentUserOrNull() user: User | null,
  ): Promise<PaginatedResponse<ProductResponse>> {
    const { items, total } = await this.searchProductsUseCase.execute(
      {
        keyword: query.keyword,
        categoryId: query.category_id,
        minPrice: query.min_price,
        maxPrice: query.max_price,
        currency: query.currency,
        isPublished: query.is_published,
        sortBy: query.sort_by,
        viewer: user?.role ?? null,
      },
      { limit: query.limit, offset: query.offset },
    );
    return paginated(
      items.map(toProductResponse),
      total,
      query.limit,
      query.offset,
    );
  }

  @OptionalAuth()
  @Get(':slugOrId')
  @ApiOperation({ summary: 'Get a product by slug or ID' })
  @SwaggerResponse({
    status: 200,
    description: 'Product details',
    type: ProductResponse,
  })
  async getOne(
    @Param('slugOrId') slugOrId: string,
    @CurrentUserOrNull() user: User | null,
  ): Promise<ApiResponse<ProductResponse>> {
    const product = await this.getProductUseCase.execute(
      slugOrId,
      user?.role ?? null,
    );
    return ok(toProductResponse(product));
  }
}
