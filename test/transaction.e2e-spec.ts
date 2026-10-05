import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/shared/infrastructure/prisma/prisma.service';
import { SampleModule } from './fixtures/sample/sample.module';
import { CreateTwoSamplesUseCase } from './fixtures/sample/create-two-samples.use-case';
import { SampleRepository } from './fixtures/sample/sample.repository';
import { Sample } from './fixtures/sample/sample.entity';

describe('Transaction & Repository Pattern (e2e / integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let useCase: CreateTwoSamplesUseCase;
  let sampleRepo: SampleRepository;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule, SampleModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    useCase = app.get<CreateTwoSamplesUseCase>(CreateTwoSamplesUseCase);
    sampleRepo = app.get<SampleRepository>(SampleRepository);

    // Create isolated test table using $executeRawUnsafe to keep schema.prisma clean
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS test_samples (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
      );
    `);
  });

  afterEach(async () => {
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE test_samples RESTART IDENTITY CASCADE;',
    );
  });

  afterAll(async () => {
    try {
      await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS test_samples;');
    } finally {
      await app.close();
    }
  });

  describe('UseCase @Transactional() boundary', () => {
    it('rolls back all changes when an error is thrown midway', async () => {
      // Act: execute use case with failure on second sample
      await expect(
        useCase.execute('First Sample', 'Second Sample (Failing)', true),
      ).rejects.toThrow(
        'Intentional failure when saving second sample: Second Sample (Failing)',
      );

      // Assert: Verify that NOT EVEN the first sample was persisted (atomic rollback)
      const count = await sampleRepo.count();
      expect(count).toBe(0);

      const rows = await prisma.$queryRaw<Array<{ id: string; name: string }>>`
        SELECT id, name FROM test_samples
      `;
      expect(rows.length).toBe(0);
    });

    it('commits both records atomically when no error occurs', async () => {
      // Act: execute use case successfully
      const [s1, s2] = await useCase.execute('Alice', 'Bob', false);

      // Assert: Verify both records exist in DB
      const count = await sampleRepo.count();
      expect(count).toBe(2);

      const found1 = await sampleRepo.findById(s1.id);
      expect(found1).not.toBeNull();
      expect(found1?.name).toBe('Alice');

      const found2 = await sampleRepo.findById(s2.id);
      expect(found2).not.toBeNull();
      expect(found2?.name).toBe('Bob');
    });
  });

  describe('PrismaSampleRepository operations via TransactionHost fallback', () => {
    it('performs CRUD operations outside explicit transactions via fallback client', async () => {
      const sample = new Sample(undefined, 'Standalone Record');
      await sampleRepo.save(sample);

      const found = await sampleRepo.findById(sample.id);
      expect(found?.name).toBe('Standalone Record');

      const list = await sampleRepo.list({ limit: 10, offset: 0 });
      expect(list.length).toBe(1);

      await sampleRepo.delete(sample.id);
      const afterDelete = await sampleRepo.findById(sample.id);
      expect(afterDelete).toBeNull();
      expect(await sampleRepo.count()).toBe(0);
    });
  });
});
