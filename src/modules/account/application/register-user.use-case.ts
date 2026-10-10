import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { DuplicateEntityException } from '../../../shared/domain/exceptions';
import { Email } from '../domain/email';
import { User } from '../domain/user.entity';
import { PasswordHasher } from './password-hasher';
import { TokenKeyGenerator } from './token-key-generator';
import { UserRepository } from './user.repository';

/**
 * Deliberately has no `role`: a public registration can only produce a
 * customer, so there is nothing for a client to escalate (R3).
 */
export interface RegisterUserCommand {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

@Injectable()
export class RegisterUserUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenKeyGenerator: TokenKeyGenerator,
  ) {}

  @Transactional()
  async execute(command: RegisterUserCommand): Promise<User> {
    const email = Email.create(command.email);

    // R2: friendly 409; a concurrent twin is caught by the UNIQUE index in save()
    if (await this.userRepo.findByEmail(email)) {
      throw new DuplicateEntityException(
        `User with email '${email.value}' already exists`,
      );
    }

    const user = new User({
      email,
      passwordHash: await this.passwordHasher.hash(command.password),
      firstName: command.firstName,
      lastName: command.lastName,
      role: 'customer',
      tokenKey: this.tokenKeyGenerator.generate(),
    });
    await this.userRepo.save(user);
    return user;
  }
}
