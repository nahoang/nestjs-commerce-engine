import { Sample } from './sample.entity';

/**
 * Persistence record structure reflecting the database schema (snake_case).
 */
export interface SamplePersistenceRecord {
  id: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Mapper separating domain entity from persistence record representation.
 */
export class SampleMapper {
  /**
   * Transforms raw database record into a clean domain entity.
   */
  static toDomain(record: SamplePersistenceRecord): Sample {
    return new Sample(
      record.id,
      record.name,
      new Date(record.created_at),
      new Date(record.updated_at),
    );
  }

  /**
   * Transforms domain entity into a persistence record for database writes.
   */
  static toPersistence(entity: Sample): SamplePersistenceRecord {
    return {
      id: entity.id,
      name: entity.name,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
    };
  }
}
