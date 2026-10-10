import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(1, { message: 'DATABASE_URL is required' }),
  API_VERSION: z.string().min(1).default('v1'),
  SECRET_KEY: z.string().min(1, { message: 'SECRET_KEY is required' }),
  ACCESS_TOKEN_EXPIRE_MINUTES: z.coerce.number().int().positive().default(30),
  RESERVATION_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  DEFAULT_CURRENCY: z.string().min(1).default('VND'),
  TAX_RATE_PERCENT: z.coerce
    .number({
      message: 'TAX_RATE_PERCENT must be a valid number',
    })
    .min(0, { message: 'TAX_RATE_PERCENT must be non-negative' })
    .max(100, { message: 'TAX_RATE_PERCENT cannot exceed 100' })
    .default(8.0),
  ALLOWED_ORIGINS: z.string().default('*'),
  // 0 disables the storefront cache
  STOREFRONT_CACHE_TTL_SECONDS: z.coerce.number().int().min(0).default(30),
  // First admin account, created at startup when both are set (empty = skip)
  BOOTSTRAP_ADMIN_EMAIL: z.string().trim().optional(),
  BOOTSTRAP_ADMIN_PASSWORD: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Validates environment variables against the Zod schema.
 * Throws a formatted Error when validation fails, preventing application startup.
 */
export function validate(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const issues = result.error.issues;
    const formattedErrors = issues
      .map((err) => `  - [${err.path.join('.')}]: ${err.message}`)
      .join('\n');

    throw new Error(
      `Environment configuration validation failed:\n${formattedErrors}`,
    );
  }

  return result.data;
}
