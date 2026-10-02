import { PrismaService } from '../../src/shared/infrastructure/prisma/prisma.service';

/**
 * Truncates all tables in the public schema of the test database,
 * resetting identity sequences (RESTART IDENTITY CASCADE).
 * System and migration tables prefixed with _ are excluded.
 */
export async function truncateAll(prisma: PrismaService): Promise<void> {
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT LIKE '_prisma%'
  `;

  if (tables.length === 0) {
    return;
  }

  const tableList = tables.map((t) => `"${t.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE;`,
  );
}
