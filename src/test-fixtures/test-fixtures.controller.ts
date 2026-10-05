import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EntityNotFoundException } from '../shared/domain/exceptions';
import { ok } from '../shared/api/envelope';
import { CreateProductTestDto } from './test-fixtures.dto';

@Controller('api/v1/test-exceptions')
export class TestExceptionsController {
  @Get('entity-not-found')
  throwEntityNotFound(): never {
    throw new EntityNotFoundException('Product', 'prod-123');
  }
}

@Controller('api/v1/test-fixtures')
export class TestFixturesController {
  @Post('products')
  @HttpCode(HttpStatus.OK)
  createProduct(@Body() body: CreateProductTestDto) {
    return ok(body);
  }
}
