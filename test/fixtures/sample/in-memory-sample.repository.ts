import { ListParams } from '../../../src/shared/application/repository';
import { Sample } from './sample.entity';
import { SampleRepository } from './sample.repository';

/**
 * In-memory fake repository implementation for fast, isolated unit tests.
 */
export class InMemorySampleRepository implements SampleRepository {
  private readonly items = new Map<string, Sample>();

  findById(id: string): Promise<Sample | null> {
    const item = this.items.get(id);
    return Promise.resolve(
      item
        ? new Sample(item.id, item.name, item.createdAt, item.updatedAt)
        : null,
    );
  }

  list(params?: ListParams): Promise<Sample[]> {
    const all = Array.from(this.items.values());
    const offset = params?.offset ?? 0;
    const limit = params?.limit ?? all.length;
    return Promise.resolve(all.slice(offset, offset + limit));
  }

  count(): Promise<number> {
    return Promise.resolve(this.items.size);
  }

  save(entity: Sample): Promise<void> {
    this.items.set(entity.id, entity);
    return Promise.resolve();
  }

  delete(id: string): Promise<void> {
    this.items.delete(id);
    return Promise.resolve();
  }

  clear(): void {
    this.items.clear();
  }
}
