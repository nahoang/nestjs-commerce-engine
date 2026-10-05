import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { ListParams } from '../../../src/shared/application/repository';
import { Sample } from './sample.entity';
import { SampleRepository } from './sample.repository';
import { SampleMapper, SamplePersistenceRecord } from './sample.mapper';

/**
 * Prisma implementation of SampleRepository.
 *
 * Notice:
 * 1. Singleton scope: Does NOT use Scope.REQUEST, retaining optimal performance and memory footprint.
 * 2. Uses TransactionHost to transparently access the active transactional client when running
 *    within a @Transactional() context, or the fallback PrismaClient when outside.
 * 3. Uses SampleMapper to isolate persistence schema from domain entity.
 */
@Injectable()
export class PrismaSampleRepository implements SampleRepository {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {}

  async findById(id: string): Promise<Sample | null> {
    const rows = await this.txHost.tx.$queryRaw<SamplePersistenceRecord[]>`
      SELECT id, name, created_at, updated_at
      FROM test_samples
      WHERE id = ${id}
      LIMIT 1
    `;

    if (!rows || rows.length === 0) {
      return null;
    }

    return SampleMapper.toDomain(rows[0]);
  }

  async list(params?: ListParams): Promise<Sample[]> {
    const limit = params?.limit ?? 50;
    const offset = params?.offset ?? 0;

    const rows = await this.txHost.tx.$queryRaw<SamplePersistenceRecord[]>`
      SELECT id, name, created_at, updated_at
      FROM test_samples
      ORDER BY created_at ASC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return rows.map((r) => SampleMapper.toDomain(r));
  }

  async count(): Promise<number> {
    const rows = await this.txHost.tx.$queryRaw<
      Array<{ count: bigint | number | string }>
    >`
      SELECT COUNT(*) as count FROM test_samples
    `;

    return Number(rows[0]?.count ?? 0);
  }

  async save(entity: Sample): Promise<void> {
    const record = SampleMapper.toPersistence(entity);

    await this.txHost.tx.$executeRaw`
      INSERT INTO test_samples (id, name, created_at, updated_at)
      VALUES (${record.id}, ${record.name}, ${record.created_at}, ${record.updated_at})
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        updated_at = EXCLUDED.updated_at
    `;
  }

  async delete(id: string): Promise<void> {
    await this.txHost.tx.$executeRaw`
      DELETE FROM test_samples WHERE id = ${id}
    `;
  }
}
