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
import { CreateCategoryUseCase } from '../application/create-category.use-case';
import { GetCategoryUseCase } from '../application/get-category.use-case';
import { ListCategoriesUseCase } from '../application/list-categories.use-case';
import { GetCategoryTreeUseCase } from '../application/get-category-tree.use-case';
import { GetBreadcrumbsUseCase } from '../application/get-breadcrumbs.use-case';
import { CreateCategoryRequest } from './create-category.request';
import { CategoryTreeQueryDto } from './category-tree-query.dto';
import {
  CategoryResponse,
  CategoryNodeResponse,
  toCategoryResponse,
  toCategoryNodeResponse,
} from './category.response';

@ApiTags('Categories')
@Controller('api/v1/categories')
export class CategoriesController {
  constructor(
    private readonly createCategoryUseCase: CreateCategoryUseCase,
    private readonly getCategoryUseCase: GetCategoryUseCase,
    private readonly listCategoriesUseCase: ListCategoriesUseCase,
    private readonly getCategoryTreeUseCase: GetCategoryTreeUseCase,
    private readonly getBreadcrumbsUseCase: GetBreadcrumbsUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a category' })
  @SwaggerResponse({
    status: 201,
    description: 'Category created successfully',
    type: CategoryResponse,
  })
  async create(
    @Body() body: CreateCategoryRequest,
  ): Promise<ApiResponse<CategoryResponse>> {
    const category = await this.createCategoryUseCase.execute({
      name: body.name,
      slug: body.slug,
      parentId: body.parent_id,
      isActive: body.is_active,
    });

    return ok(toCategoryResponse(category));
  }

  @Get()
  @ApiOperation({ summary: 'List categories (offset pagination)' })
  @SwaggerResponse({
    status: 200,
    description: 'Paginated list of categories',
  })
  async list(
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResponse<CategoryResponse>> {
    const { items, total } = await this.listCategoriesUseCase.execute(query);
    return paginated(
      items.map(toCategoryResponse),
      total,
      query.limit,
      query.offset,
    );
  }

  @Get('tree')
  @ApiOperation({ summary: 'Get the nested category tree (or a subtree)' })
  @SwaggerResponse({
    status: 200,
    description: 'Category tree with nested children',
    type: [CategoryNodeResponse],
  })
  async getTree(
    @Query() query: CategoryTreeQueryDto,
  ): Promise<ApiResponse<CategoryNodeResponse[]>> {
    const tree = await this.getCategoryTreeUseCase.execute(query.root_id);
    return ok(tree.map(toCategoryNodeResponse));
  }

  @Get(':slugOrId/breadcrumbs')
  @ApiOperation({ summary: 'Get breadcrumbs from the root to this category' })
  @SwaggerResponse({
    status: 200,
    description: 'Categories ordered from the root to the current category',
    type: [CategoryResponse],
  })
  async getBreadcrumbs(
    @Param('slugOrId') slugOrId: string,
  ): Promise<ApiResponse<CategoryResponse[]>> {
    const breadcrumbs = await this.getBreadcrumbsUseCase.execute(slugOrId);
    return ok(breadcrumbs.map(toCategoryResponse));
  }

  @Get(':slugOrId')
  @ApiOperation({ summary: 'Get a category by slug or ID' })
  @SwaggerResponse({
    status: 200,
    description: 'Category details',
    type: CategoryResponse,
  })
  async getOne(
    @Param('slugOrId') slugOrId: string,
  ): Promise<ApiResponse<CategoryResponse>> {
    const category = await this.getCategoryUseCase.execute(slugOrId);
    return ok(toCategoryResponse(category));
  }
}
