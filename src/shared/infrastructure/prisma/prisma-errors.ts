import { Prisma } from '@prisma/client';

/**
 * Returns the column names of a unique-constraint violation (Prisma P2002),
 * or null when the error is anything else.
 */
export function uniqueViolationTargets(error: unknown): string[] | null {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== 'P2002'
  ) {
    return null;
  }
  const target: unknown = error.meta?.target;
  if (Array.isArray(target)) {
    return target.map(String);
  }
  return typeof target === 'string' ? [target] : [];
}
