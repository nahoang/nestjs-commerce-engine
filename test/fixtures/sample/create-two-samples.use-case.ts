import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { Sample } from './sample.entity';
import { SampleRepository } from './sample.repository';

/**
 * Use case demonstrating transactional execution boundary.
 *
 * In Clean Architecture:
 * - Depends only on the abstract SampleRepository contract.
 * - Does not import or know anything about Prisma or database connections.
 * - Marked with @Transactional() so all operations within execute() share the same transaction.
 */
@Injectable()
export class CreateTwoSamplesUseCase {
  constructor(private readonly sampleRepository: SampleRepository) {}

  @Transactional()
  async execute(
    firstName: string,
    secondName: string,
    shouldFailOnSecond = true,
  ): Promise<[Sample, Sample]> {
    const sample1 = new Sample(undefined, firstName);
    await this.sampleRepository.save(sample1);

    if (shouldFailOnSecond) {
      throw new Error(
        `Intentional failure when saving second sample: ${secondName}`,
      );
    }

    const sample2 = new Sample(undefined, secondName);
    await this.sampleRepository.save(sample2);

    return [sample1, sample2];
  }
}
