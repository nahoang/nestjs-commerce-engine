import { validate } from './env.validation';

describe('Environment Validation', () => {
  const validMinimalConfig = {
    DATABASE_URL:
      'postgresql://postgres:postgres@localhost:5432/commerce?schema=public',
    SECRET_KEY: 'test-secret-key-32-chars-long-for-valid-testing',
  };

  it('should validate and apply default values when given minimal valid config', () => {
    const result = validate(validMinimalConfig);

    expect(result).toBeDefined();
    expect(result.DATABASE_URL).toBe(validMinimalConfig.DATABASE_URL);
    expect(result.SECRET_KEY).toBe(validMinimalConfig.SECRET_KEY);
    expect(result.NODE_ENV).toBe('development');
    expect(result.PORT).toBe(3000);
    expect(result.API_VERSION).toBe('v1');
    expect(result.ACCESS_TOKEN_EXPIRE_MINUTES).toBe(30);
    expect(result.RESERVATION_TTL_MINUTES).toBe(15);
    expect(result.DEFAULT_CURRENCY).toBe('VND');
    expect(result.TAX_RATE_PERCENT).toBe(8.0);
    expect(result.ALLOWED_ORIGINS).toBe('*');
  });

  it('should validate and coerce custom configuration values correctly', () => {
    const customConfig = {
      ...validMinimalConfig,
      NODE_ENV: 'production',
      PORT: '8080',
      API_VERSION: 'v2',
      ACCESS_TOKEN_EXPIRE_MINUTES: '60',
      RESERVATION_TTL_MINUTES: '20',
      DEFAULT_CURRENCY: 'USD',
      TAX_RATE_PERCENT: '10.5',
      ALLOWED_ORIGINS: 'http://localhost:3000,http://localhost:5173',
    };

    const result = validate(customConfig);

    expect(result.NODE_ENV).toBe('production');
    expect(result.PORT).toBe(8080);
    expect(result.API_VERSION).toBe('v2');
    expect(result.ACCESS_TOKEN_EXPIRE_MINUTES).toBe(60);
    expect(result.RESERVATION_TTL_MINUTES).toBe(20);
    expect(result.DEFAULT_CURRENCY).toBe('USD');
    expect(result.TAX_RATE_PERCENT).toBe(10.5);
    expect(result.ALLOWED_ORIGINS).toBe(
      'http://localhost:3000,http://localhost:5173',
    );
  });

  it('should throw an error when DATABASE_URL is missing', () => {
    const configWithoutDbUrl = {
      SECRET_KEY: 'test-secret-key-32-chars-long-for-valid-testing',
    };

    expect(() => validate(configWithoutDbUrl)).toThrow(/DATABASE_URL/);
  });

  it('should throw an error when SECRET_KEY is missing', () => {
    const configWithoutSecretKey = {
      DATABASE_URL:
        'postgresql://postgres:postgres@localhost:5432/commerce?schema=public',
    };

    expect(() => validate(configWithoutSecretKey)).toThrow(/SECRET_KEY/);
  });

  it('should throw an error when TAX_RATE_PERCENT is "abc"', () => {
    const configWithInvalidTax = {
      ...validMinimalConfig,
      TAX_RATE_PERCENT: 'abc',
    };

    expect(() => validate(configWithInvalidTax)).toThrow(/TAX_RATE_PERCENT/);
  });

  it('should throw an error when PORT is invalid', () => {
    const configWithInvalidPort = {
      ...validMinimalConfig,
      PORT: 'invalid-port',
    };

    expect(() => validate(configWithInvalidPort)).toThrow(/PORT/);
  });

  it('should throw an error when NODE_ENV has an invalid enum value', () => {
    const configWithInvalidEnv = {
      ...validMinimalConfig,
      NODE_ENV: 'staging',
    };

    expect(() => validate(configWithInvalidEnv)).toThrow(/NODE_ENV/);
  });
});
