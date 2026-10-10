import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { UnauthenticatedException } from '../../../shared/domain/exceptions';
import { User } from '../domain/user.entity';
import { PasswordHasher } from './password-hasher';
import { IssuedToken, TokenService } from './token-service';
import { TokenKeyGenerator } from './token-key-generator';
import { UserRepository } from './user.repository';

export interface ChangePasswordCommand {
  user: User;
  currentPassword: string;
  newPassword: string;
}

@Injectable()
export class ChangePasswordUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenKeyGenerator: TokenKeyGenerator,
    private readonly tokenService: TokenService,
  ) {}

  /**
   * R5: the current password is required; success replaces the token key, which
   * invalidates every token issued before, and returns a token for the new key.
   */
  @Transactional()
  async execute(command: ChangePasswordCommand): Promise<IssuedToken> {
    const { user } = command;

    if (
      !(await this.passwordHasher.verify(
        command.currentPassword,
        user.passwordHash,
      ))
    ) {
      throw new UnauthenticatedException();
    }

    user.changePassword(
      await this.passwordHasher.hash(command.newPassword),
      this.tokenKeyGenerator.generate(),
    );
    await this.userRepo.save(user);
    return this.tokenService.issue(user);
  }
}
