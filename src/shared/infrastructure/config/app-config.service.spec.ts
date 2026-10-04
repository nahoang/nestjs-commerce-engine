import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Decimal } from 'decimal.js';
import { AppConfigService } from './app-config.service';
import { AppConfigModule } from './app-config.module';
import { validate, EnvConfig } from './env.validation';

describe('AppConfigService', () => {
  let service: AppConfigService;

  describe('with valid testing configuration via NestJS DI', () => {
    beforeEach(async () => {
      process.env.DATABASE_URL =
        'postgresql://postgres:postgres@localhost:5432/commerce_test?schema=public';
      process.env.SECRET_KEY = 'test-secret-key-32-chars-for-service-spec';
      process.env.NODE_ENV = 'test';
      process.env.PORT = '3001';
      process.env.API_VERSION = 'v1';
      process.env.ACCESS_TOKEN_EXPIRE_MINUTES = '30';
      process.env.RESERVATION_TTL_MINUTES = '15';
      process.env.DEFAULT_CURRENCY = 'VND';
      process.env.TAX_RATE_PERCENT = '8.0';
      process.env.ALLOWED_ORIGINS =
        'http://localhost:3000,http://localhost:5173';

      const module: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            validate,
          }),
          AppConfigModule,
        ],
      }).compile();

      service = module.get<AppConfigService>(AppConfigService);
    });

    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should return taxRatePercent as an instance of Decimal, NOT number', () => {
      const taxRate = service.taxRatePercent;

      expect(taxRate).toBeInstanceOf(Decimal);
      expect(typeof taxRate).toBe('object');
      expect(typeof (taxRate as unknown)).not.toBe('number');
      expect(taxRate.equals(new Decimal(8.0))).toBe(true);
      expect(taxRate.toString()).toBe('8');
    });

    it('should return correctly typed getters', () => {
      expect(service.nodeEnv).toBe('test');
      expect(service.isTest).toBe(true);
      expect(service.isDevelopment).toBe(false);
      expect(service.isProduction).toBe(false);
      expect(service.port).toBe(3001);
      expect(service.apiVersion).toBe('v1');
      expect(service.databaseUrl).toBe(
        'postgresql://postgres:postgres@localhost:5432/commerce_test?schema=public',
      );
      expect(service.secretKey).toBe(
        'test-secret-key-32-chars-for-service-spec',
      );
      expect(service.accessTokenExpireMinutes).toBe(30);
      expect(service.reservationTtlMinutes).toBe(15);
      expect(service.defaultCurrency).toBe('VND');
    });

    it('should parse ALLOWED_ORIGINS into an array of trimmed strings', () => {
      expect(service.allowedOrigins).toEqual([
        'http://localhost:3000',
        'http://localhost:5173',
      ]);
    });
  });

  describe('allowedOrigins default wildcard', () => {
    it('should return ["*"] when ALLOWED_ORIGINS is "*"', () => {
      const mockConfigService = {
        get: jest.fn().mockImplementation((key: string) => {
          if (key === 'ALLOWED_ORIGINS') return '*';
          if (key === 'TAX_RATE_PERCENT') return 8.0;
          return undefined;
        }),
      } as unknown as ConfigService<EnvConfig, true>;

      const appConfig = new AppConfigService(mockConfigService);
      expect(appConfig.allowedOrigins).toEqual(['*']);
    });
  });
});
