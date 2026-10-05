import { Test, TestingModule } from '@nestjs/testing';
import { ClsModule } from 'nestjs-cls';
import {
  ClsPluginTransactional,
  NoOpTransactionalAdapter,
} from '@nestjs-cls/transactional';
import { Sample } from '../../../test/fixtures/sample/sample.entity';
import { SampleRepository } from '../../../test/fixtures/sample/sample.repository';
import { InMemorySampleRepository } from '../../../test/fixtures/sample/in-memory-sample.repository';
import { CreateTwoSamplesUseCase } from '../../../test/fixtures/sample/create-two-samples.use-case';

describe('Repository & Transaction Unit Tests (In-Memory Fake)', () => {
  let useCase: CreateTwoSamplesUseCase;
  let sampleRepo: InMemorySampleRepository;

  beforeEach(async () => {
    sampleRepo = new InMemorySampleRepository();

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ClsModule.forRoot({
          plugins: [
            new ClsPluginTransactional({
              adapter: new NoOpTransactionalAdapter({
                tx: {},
                disableWarning: true,
              }),
            }),
          ],
        }),
      ],
      providers: [
        CreateTwoSamplesUseCase,
        {
          provide: SampleRepository,
          useValue: sampleRepo,
        },
      ],
    }).compile();

    useCase = moduleRef.get<CreateTwoSamplesUseCase>(CreateTwoSamplesUseCase);
  });

  describe('Use Case with In-Memory Repository (Unit Isolation)', () => {
    it('should save two samples successfully when shouldFailOnSecond is false', async () => {
      const [s1, s2] = await useCase.execute('Sample 1', 'Sample 2', false);

      expect(s1).toBeDefined();
      expect(s1.name).toBe('Sample 1');
      expect(s2).toBeDefined();
      expect(s2.name).toBe('Sample 2');

      const count = await sampleRepo.count();
      expect(count).toBe(2);

      const found1 = await sampleRepo.findById(s1.id);
      expect(found1).not.toBeNull();
      expect(found1?.name).toBe('Sample 1');
    });

    it('should throw error when shouldFailOnSecond is true', async () => {
      await expect(
        useCase.execute('Valid Sample', 'Failing Sample', true),
      ).rejects.toThrow(
        'Intentional failure when saving second sample: Failing Sample',
      );

      // Note: in a pure in-memory unit test without database transaction manager,
      // the fake repo recorded the first save because it has no rollback mechanism.
      // Database rollback is verified in transaction.e2e-spec.ts.
      const firstFound = await sampleRepo.list();
      expect(firstFound.length).toBe(1);
      expect(firstFound[0].name).toBe('Valid Sample');
    });
  });

  describe('Repository generic contract operations', () => {
    it('should support save, findById, list with pagination, and delete', async () => {
      const sample = new Sample(undefined, 'Contract Test');
      await sampleRepo.save(sample);

      const found = await sampleRepo.findById(sample.id);
      expect(found?.name).toBe('Contract Test');

      const list = await sampleRepo.list({ limit: 10, offset: 0 });
      expect(list.length).toBe(1);

      await sampleRepo.delete(sample.id);
      const afterDelete = await sampleRepo.findById(sample.id);
      expect(afterDelete).toBeNull();
      expect(await sampleRepo.count()).toBe(0);
    });
  });
});
