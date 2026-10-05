import {
  Repository,
  ListParams,
} from '../../../src/shared/application/repository';
import { Sample } from './sample.entity';

/**
 * Abstract class acting as both TypeScript type and NestJS DI Token.
 * Pure application layer abstraction: no Prisma or database imports.
 */
export abstract class SampleRepository implements Repository<Sample> {
  abstract findById(id: string): Promise<Sample | null>;
  abstract list(params?: ListParams): Promise<Sample[]>;
  abstract count(): Promise<number>;
  abstract save(entity: Sample): Promise<void>;
  abstract delete(id: string): Promise<void>;
}
