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
  @ApiOperation({ summary: 'Tạo danh mục mới' })
  @SwaggerResponse({
    status: 201,
    description: 'Danh mục đã được tạo thành công',
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
  @ApiOperation({ summary: 'Xem danh sách danh mục (phân trang offset)' })
  @SwaggerResponse({
    status: 200,
    description: 'Danh sách danh mục có phân trang',
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
  @ApiOperation({ summary: 'Xem cây danh mục lồng nhau (hoặc cây con)' })
  @SwaggerResponse({
    status: 200,
    description: 'Cây danh mục với các danh mục con lồng nhau',
    type: [CategoryNodeResponse],
  })
  async getTree(
    @Query() query: CategoryTreeQueryDto,
  ): Promise<ApiResponse<CategoryNodeResponse[]>> {
    const tree = await this.getCategoryTreeUseCase.execute(query.root_id);
    return ok(tree.map(toCategoryNodeResponse));
  }

  @Get(':slugOrId/breadcrumbs')
  @ApiOperation({ summary: 'Lấy breadcrumbs từ gốc đến danh mục hiện tại' })
  @SwaggerResponse({
    status: 200,
    description: 'Danh sách danh mục từ gốc đến danh mục hiện tại',
    type: [CategoryResponse],
  })
  async getBreadcrumbs(
    @Param('slugOrId') slugOrId: string,
  ): Promise<ApiResponse<CategoryResponse[]>> {
    const breadcrumbs = await this.getBreadcrumbsUseCase.execute(slugOrId);
    return ok(breadcrumbs.map(toCategoryResponse));
  }

  @Get(':slugOrId')
  @ApiOperation({ summary: 'Chi tiết danh mục theo slug hoặc ID' })
  @SwaggerResponse({
    status: 200,
    description: 'Chi tiết danh mục',
    type: CategoryResponse,
  })
  async getOne(
    @Param('slugOrId') slugOrId: string,
  ): Promise<ApiResponse<CategoryResponse>> {
    const category = await this.getCategoryUseCase.execute(slugOrId);
    return ok(toCategoryResponse(category));
  }
}
