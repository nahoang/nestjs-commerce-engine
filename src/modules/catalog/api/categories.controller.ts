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
import { CreateCategoryRequest } from './create-category.request';
import { CategoryResponse, toCategoryResponse } from './category.response';

@ApiTags('Categories')
@Controller('api/v1/categories')
export class CategoriesController {
  constructor(
    private readonly createCategoryUseCase: CreateCategoryUseCase,
    private readonly getCategoryUseCase: GetCategoryUseCase,
    private readonly listCategoriesUseCase: ListCategoriesUseCase,
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
