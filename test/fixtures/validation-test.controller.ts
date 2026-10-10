import { Public } from '../../src/modules/account/api/auth-metadata';
import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../src/shared/api/pagination.dto';
import { ok, paginated } from '../../src/shared/api/envelope';

export class VariantTestDto {
  @IsString()
  @IsNotEmpty({ message: 'sku should not be empty' })
  sku!: string;

  @IsNumber({}, { message: 'price must be a number' })
  price!: number;
}

export class CreateProductTestDto {
  @IsString()
  @IsNotEmpty({ message: 'name should not be empty' })
  name!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantTestDto)
  variants!: VariantTestDto[];
}

@Public()
@Controller('test-fixtures')
export class ValidationTestController {
  @Post('products')
  @HttpCode(HttpStatus.OK)
  createProduct(@Body() body: CreateProductTestDto) {
    return ok(body);
  }

  @Get('products')
  getProducts(@Query() query: PaginationQueryDto) {
    return paginated(
      [{ id: 'p1', name: 'Product 1' }],
      10,
      query.limit,
      query.offset,
    );
  }
}
