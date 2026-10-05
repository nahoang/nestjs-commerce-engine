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

  // Deploy Prisma migrations into test database
  try {
    execSync(`node "${prismaCliPath}" migrate deploy`, {
      env: {
        ...process.env,
        DATABASE_URL: testDbUrl,
      },
      stdio: 'inherit',
    });
  } catch (error) {
    console.warn(
      `[globalSetup] Database migration deploy skipped: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
