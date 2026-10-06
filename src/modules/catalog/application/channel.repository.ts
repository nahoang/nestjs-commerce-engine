import { ListParams } from '../../../shared/application/repository';
import { Channel } from '../domain/channel.entity';

/** DI token and contract for Channel persistence (no ORM types). */
export abstract class ChannelRepository {
  abstract findBySlug(slug: string): Promise<Channel | null>;
  abstract list(params?: ListParams): Promise<Channel[]>;
  abstract count(): Promise<number>;
  /** Inserts or updates. Duplicate slug -> DuplicateEntityException. */
  abstract save(entity: Channel): Promise<void>;
}
