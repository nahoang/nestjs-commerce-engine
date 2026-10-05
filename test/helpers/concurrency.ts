/**
 * Executes a task function `n` times concurrently using Promise.all.
 * Used for testing race conditions, row locking, and high-concurrency invariants.
 *
 * @param n Number of concurrent executions
 * @param fn Callback receiving task index (0 to n - 1) and returning a Promise
 * @returns Array of resolved values in index order
 */
export async function runConcurrently<T>(
  n: number,
  fn: (index: number) => Promise<T>,
): Promise<T[]> {
  const tasks = Array.from({ length: n }, (_, index) => fn(index));
  return Promise.all(tasks);
}
