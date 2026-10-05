import { Module } from '@nestjs/common';
import { SampleRepository } from './sample.repository';
import { PrismaSampleRepository } from './prisma-sample.repository';
import { CreateTwoSamplesUseCase } from './create-two-samples.use-case';

@Module({
  providers: [
    {
      provide: SampleRepository,
      useClass: PrismaSampleRepository,
    },
    CreateTwoSamplesUseCase,
  ],
  exports: [SampleRepository, CreateTwoSamplesUseCase],
})
export class SampleModule {}
