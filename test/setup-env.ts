import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

const envTestPath = path.resolve(__dirname, '../.env.test');
if (fs.existsSync(envTestPath)) {
  dotenv.config({ path: envTestPath, override: true, quiet: true });
} else {
  process.env.NODE_ENV = process.env.NODE_ENV || 'test';
  process.env.PORT = process.env.PORT || '3001';
  process.env.API_VERSION = process.env.API_VERSION || 'v1';
  process.env.DATABASE_URL =
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/commerce_test?schema=public';
  process.env.SECRET_KEY =
    process.env.SECRET_KEY ||
    'test-secret-key-32-chars-for-ci-and-testing-only';
}

// Login throttling must not interfere with tests; the throttling test lowers it itself
process.env.LOGIN_RATE_LIMIT = process.env.LOGIN_RATE_LIMIT || '1000';
