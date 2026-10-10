import { Email } from '../domain/email';
import { User } from '../domain/user.entity';

/** DI token and contract for User persistence (no ORM types). */
export abstract class UserRepository {
  abstract findById(id: string): Promise<User | null>;
  abstract findByEmail(email: Email): Promise<User | null>;
  /** Inserts or updates. Duplicate email -> DuplicateEntityException. */
  abstract save(user: User): Promise<void>;
}
