import {
  INestApplication,
  ValidationPipe,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { ValidationErrorItem } from './shared/api/envelope';
import {
  AllExceptionsFilter,
  HttpExceptionFilter,
  DomainExceptionFilter,
} from './shared/api/filters';
import { LoggingInterceptor } from './shared/api/interceptors';
import { AppConfigService } from './shared/infrastructure/config';
import { ClsService } from 'nestjs-cls';

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
  // CORS: allow origins configured in ALLOWED_ORIGINS
  let allowedOrigins: string[] = ['*'];
  try {
    const configService = app.get(AppConfigService, { strict: false });
    if (configService) {
      allowedOrigins = configService.allowedOrigins;
    }
  } catch {
    // Fallback if AppConfigService is not available in DI container
  }

  app.enableCors({
    origin: allowedOrigins.includes('*') ? '*' : allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global logging interceptor (logs {method} {path} → {status} in {ms}ms [requestId])
  let clsService: ClsService | undefined;
  try {
    clsService = app.get(ClsService, { strict: false });
  } catch {
    // Fallback if ClsService is not available in DI container
  }
  app.useGlobalInterceptors(new LoggingInterceptor(clsService));

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

  // Global exception filters registration:
  // In NestJS, RouterExceptionFilters.create reverses the filter array (filters.reverse()),
  // and selects the first matching filter using Array.find().
  // Therefore, filters must be registered from least specific (catch-all) to most specific:
  // 1. AllExceptionsFilter (@Catch()) registered first -> evaluated last as fallback
  // 2. HttpExceptionFilter (@Catch(HttpException)) registered second -> evaluated second
  // 3. DomainExceptionFilter (@Catch(DomainException)) registered third -> evaluated first
  app.useGlobalFilters(
    new AllExceptionsFilter(),
    new HttpExceptionFilter(),
    new DomainExceptionFilter(),
  );

  return app;
}
