import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { Email } from '../domain/email';
import { User } from '../domain/user.entity';
import { PasswordHasher } from './password-hasher';
import { TokenKeyGenerator } from './token-key-generator';
import { UserRepository } from './user.repository';

export interface BootstrapAdminCommand {
  email: string;
  password: string;
}

export type BootstrapAdminResult = 'created' | 'already-exists';

/** Creates the first admin account unless a user with that email already exists (R5). */
@Injectable()
export class BootstrapAdminUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenKeyGenerator: TokenKeyGenerator,
  ) {}

  @Transactional()
  async execute(command: BootstrapAdminCommand): Promise<BootstrapAdminResult> {
    const email = Email.create(command.email);

    // Checked before hashing: a restart must not pay the hashing cost
    if (await this.userRepo.findByEmail(email)) {
      return 'already-exists';
    }

    const admin = new User({
      email,
      passwordHash: await this.passwordHasher.hash(command.password),
      firstName: 'Admin',
      lastName: 'Admin',
      role: 'admin',
      tokenKey: this.tokenKeyGenerator.generate(),
    });
    await this.userRepo.save(admin);
    return 'created';
  }
}
