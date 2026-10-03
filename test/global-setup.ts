import { execSync } from 'child_process';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

export default function globalSetup(): void {
  const envTestPath = path.resolve(__dirname, '../.env.test');
  if (fs.existsSync(envTestPath)) {
    dotenv.config({ path: envTestPath, quiet: true });
  }

  const testDbUrl =
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/commerce_test?schema=public';

  const prismaCliPath = path.resolve(
    __dirname,
    '../node_modules/prisma/build/index.js',
  );

  // Synchronize Prisma schema into test database
  execSync(`node "${prismaCliPath}" db push --skip-generate`, {
    env: {
      ...process.env,
      DATABASE_URL: testDbUrl,
    },
    stdio: 'inherit',
  });
}
