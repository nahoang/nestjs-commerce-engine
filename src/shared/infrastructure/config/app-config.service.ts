import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Decimal } from 'decimal.js';
import { EnvConfig } from './env.validation';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService<EnvConfig, true>) {}

  get nodeEnv(): 'development' | 'production' | 'test' {
    return this.configService.get('NODE_ENV', { infer: true });
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get isTest(): boolean {
    return this.nodeEnv === 'test';
  }

  get port(): number {
    return this.configService.get('PORT', { infer: true });
  }

  get databaseUrl(): string {
    return this.configService.get('DATABASE_URL', { infer: true });
  }

  get apiVersion(): string {
    return this.configService.get('API_VERSION', { infer: true });
  }

  get secretKey(): string {
    return this.configService.get('SECRET_KEY', { infer: true });
  }

  get accessTokenExpireMinutes(): number {
    return this.configService.get('ACCESS_TOKEN_EXPIRE_MINUTES', {
      infer: true,
    });
  }

  get reservationTtlMinutes(): number {
    return this.configService.get('RESERVATION_TTL_MINUTES', { infer: true });
  }

  get defaultCurrency(): string {
    return this.configService.get('DEFAULT_CURRENCY', { infer: true });
  }

  get taxRatePercent(): Decimal {
    const raw = this.configService.get('TAX_RATE_PERCENT', { infer: true });
    return new Decimal(raw);
  }

  get storefrontCacheTtlSeconds(): number {
    return this.configService.get('STOREFRONT_CACHE_TTL_SECONDS', {
      infer: true,
    });
  }

  /** Empty or unset means "do not bootstrap an admin". */
  get bootstrapAdminEmail(): string | undefined {
    return (
      this.configService.get('BOOTSTRAP_ADMIN_EMAIL', { infer: true }) ||
      undefined
    );
  }

  get bootstrapAdminPassword(): string | undefined {
    return (
      this.configService.get('BOOTSTRAP_ADMIN_PASSWORD', { infer: true }) ||
      undefined
    );
  }

  get allowedOrigins(): string[] {
    const raw = this.configService.get('ALLOWED_ORIGINS', { infer: true });
    if (!raw || raw.trim() === '*') {
      return ['*'];
    }
    return raw
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0);
  }
}
