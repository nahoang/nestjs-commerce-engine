import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

const envTestPath = path.resolve(__dirname, '../.env.test');
if (fs.existsSync(envTestPath)) {
  dotenv.config({ path: envTestPath, override: true, quiet: true });
} else {
  process.env.DATABASE_URL =
    'postgresql://postgres:postgres@localhost:5432/commerce_test?schema=public';
}
