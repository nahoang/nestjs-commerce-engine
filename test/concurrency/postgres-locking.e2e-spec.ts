import { INestApplication } from '@nestjs/common';
import { createTestApp } from '../helpers/test-app';
import { PrismaService } from '../../src/shared/infrastructure/prisma/prisma.service';
import { runConcurrently } from '../helpers/concurrency';

describe('PostgreSQL Row-Level Locking & Concurrency (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const context = await createTestApp();
    app = context.app;
    prisma = context.prisma;

    // Create an isolated table for concurrency testing
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS concurrency_items (
        id VARCHAR(36) PRIMARY KEY,
        balance INT NOT NULL,
        version INT NOT NULL DEFAULT 0
      );
    `);
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE concurrency_items RESTART IDENTITY CASCADE;',
    );
  });

  afterAll(async () => {
    try {
      await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS concurrency_items;');
    } finally {
      await app.close();
    }
  });

  it('proves SELECT ... FOR UPDATE serializes concurrent transactions and blocks Tx2 until Tx1 commits', async () => {
    const itemId = 'item-lock-1';
    await prisma.$executeRawUnsafe(
      `INSERT INTO concurrency_items (id, balance) VALUES ('${itemId}', 100);`,
    );

    const eventLog: string[] = [];

    // Deferred promises for deterministic synchronization between the two transactions
    let signalTx1HasLock!: () => void;
    const tx1HasLockPromise = new Promise<void>((resolve) => {
      signalTx1HasLock = resolve;
    });

    let signalTx2AttemptingLock!: () => void;
    const tx2AttemptingLockPromise = new Promise<void>((resolve) => {
      signalTx2AttemptingLock = resolve;
    });

    // Transaction 1: Locks row, updates balance to 150, then commits
    const tx1Promise = prisma.$transaction(
      async (tx) => {
        eventLog.push('tx1:start');

        // Tx1 locks the row
        const [lockedItem] = await tx.$queryRaw<
          Array<{ id: string; balance: number }>
        >`
          SELECT id, balance FROM concurrency_items WHERE id = ${itemId} FOR UPDATE
        `;
        expect(lockedItem.balance).toBe(100);
        eventLog.push('tx1:locked');

        // Notify Tx2 that Tx1 has acquired the row lock
        signalTx1HasLock();

        // Wait until Tx2 has started its lock acquisition attempt
        await tx2AttemptingLockPromise;

        // Yield briefly to ensure Tx2 is queued in PostgreSQL lock wait queue
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Update balance to 150
        await tx.$executeRaw`
          UPDATE concurrency_items SET balance = 150 WHERE id = ${itemId}
        `;
        eventLog.push('tx1:updated');
        eventLog.push('tx1:commit');
      },
      { maxWait: 5000, timeout: 10000 },
    );

    // Transaction 2: Competes for the same row lock
    const tx2Promise = prisma.$transaction(
      async (tx) => {
        eventLog.push('tx2:start');

        // Wait until Tx1 holds the lock before trying to lock
        await tx1HasLockPromise;

        eventLog.push('tx2:attempt_lock');
        signalTx2AttemptingLock();

        // This query will BLOCK until Tx1 commits
        const [lockedItem] = await tx.$queryRaw<
          Array<{ id: string; balance: number }>
        >`
          SELECT id, balance FROM concurrency_items WHERE id = ${itemId} FOR UPDATE
        `;
        eventLog.push('tx2:acquired_lock');

        // Under PostgreSQL Read Committed, SELECT ... FOR UPDATE re-evaluates the locked row
        // after Tx1 commits, therefore reading the new balance (150) rather than the stale (100)
        expect(lockedItem.balance).toBe(150);

        // Tx2 updates balance to 200
        await tx.$executeRaw`
          UPDATE concurrency_items SET balance = 200 WHERE id = ${itemId}
        `;
        eventLog.push('tx2:updated');
        eventLog.push('tx2:commit');
      },
      { maxWait: 5000, timeout: 10000 },
    );

    await Promise.all([tx1Promise, tx2Promise]);

    // Verify chronological event sequence:
    // Tx2 MUST acquire the lock AFTER Tx1 commits!
    const tx1CommitIndex = eventLog.indexOf('tx1:commit');
    const tx2AcquiredIndex = eventLog.indexOf('tx2:acquired_lock');

    expect(tx1CommitIndex).toBeGreaterThan(-1);
    expect(tx2AcquiredIndex).toBeGreaterThan(-1);
    expect(tx2AcquiredIndex).toBeGreaterThan(tx1CommitIndex);

    // Verify final state in database
    const [finalRow] = await prisma.$queryRaw<
      Array<{ id: string; balance: number }>
    >`
      SELECT id, balance FROM concurrency_items WHERE id = ${itemId}
    `;
    expect(finalRow.balance).toBe(200);
  });

  it('prevents lost updates under high concurrency using runConcurrently helper', async () => {
    const itemId = 'item-counter';
    await prisma.$executeRawUnsafe(
      `INSERT INTO concurrency_items (id, balance) VALUES ('${itemId}', 0);`,
    );

    const concurrentWorkers = 5;
    const incrementAmount = 10;

    // Execute 5 concurrent transactions each reading, waiting, and incrementing by 10
    await runConcurrently(concurrentWorkers, async () => {
      await prisma.$transaction(
        async (tx) => {
          // Lock row exclusively to serialize reads and writes
          const [row] = await tx.$queryRaw<
            Array<{ id: string; balance: number }>
          >`
            SELECT id, balance FROM concurrency_items WHERE id = ${itemId} FOR UPDATE
          `;

          const currentBalance = row.balance;

          // Simulate micro calculation delay
          await new Promise((resolve) => setTimeout(resolve, 10));

          await tx.$executeRaw`
            UPDATE concurrency_items SET balance = ${currentBalance + incrementAmount}
            WHERE id = ${itemId}
          `;
        },
        { maxWait: 5000, timeout: 10000 },
      );
    });

    // Verify: No lost updates occurred; balance must be 5 * 10 = 50
    const [finalItem] = await prisma.$queryRaw<
      Array<{ id: string; balance: number }>
    >`
      SELECT id, balance FROM concurrency_items WHERE id = ${itemId}
    `;
    expect(finalItem.balance).toBe(concurrentWorkers * incrementAmount);
  });
});
