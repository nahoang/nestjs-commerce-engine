import { Controller, Get, ForbiddenException } from '@nestjs/common';
import {
  EntityNotFoundException,
  DuplicateEntityException,
  InsufficientStockException,
  InvalidOperationException,
} from '../../src/shared/domain/exceptions';

@Controller('test-exceptions')
export class ExceptionTestController {
  @Get('entity-not-found')
  throwEntityNotFound() {
    throw new EntityNotFoundException('Product', 'prod-123');
  }

  @Get('insufficient-stock')
  throwInsufficientStock() {
    throw new InsufficientStockException(
      'Requested 10 units but only 3 available',
    );
  }

  @Get('duplicate-entity')
  throwDuplicateEntity() {
    throw new DuplicateEntityException(
      'Product with slug "awesome-shirt" already exists',
    );
  }

  @Get('invalid-operation')
  throwInvalidOperation() {
    throw new InvalidOperationException('Cannot cancel already shipped order');
  }

  @Get('http-forbidden')
  throwHttpForbidden() {
    throw new ForbiddenException('Admin role required');
  }

  @Get('unhandled-error')
  throwUnhandledError() {
    throw new Error('Database password connection timeout at db.internal:5432');
  }
}
