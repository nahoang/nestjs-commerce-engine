import {
  INestApplication,
  ValidationPipe,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { ValidationErrorItem } from './shared/api/envelope';

/**
 * Recursively flattens class-validator ValidationErrors into { field, message } items.
 * Nested properties are formatted with dot notation (e.g., 'variants.0.sku').
 */
export function formatValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): ValidationErrorItem[] {
  const result: ValidationErrorItem[] = [];

  for (const error of errors) {
    const currentPath = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;

    if (error.constraints) {
      for (const message of Object.values(error.constraints)) {
        result.push({
          field: currentPath,
          message,
        });
      }
    }

    if (error.children && error.children.length > 0) {
      result.push(...formatValidationErrors(error.children, currentPath));
    }
  }

  return result;
}

/**
 * Configures global pipes, filters, interceptors, CORS, etc.
 * This is the SINGLE SOURCE OF TRUTH for application-wide configuration,
 * invoked identically by main.ts (bootstrap) and e2e test helpers (test-app.ts).
 */
export function configureApp(app: INestApplication): INestApplication {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors: ValidationError[]) => {
        return new UnprocessableEntityException({
          detail: 'Request validation failed',
          error_code: 'VALIDATION_ERROR',
          errors: formatValidationErrors(errors),
        });
      },
    }),
  );

  return app;
}
