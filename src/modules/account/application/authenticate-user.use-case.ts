import { Injectable } from '@nestjs/common';
import { UnauthenticatedException } from '../../../shared/domain/exceptions';
import { Email } from '../domain/email';
import { PasswordHasher } from './password-hasher';
import { IssuedToken, TokenService } from './token-service';
import { UserRepository } from './user.repository';

export interface AuthenticateUserCommand {
  email: string;
  password: string;
}

@Injectable()
export class AuthenticateUserUseCase {
  // Hash of a throwaway password, used to spend the same time when the email is unknown
  private decoyHash?: Promise<string>;

  constructor(
    private readonly userRepo: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
  ) {}

  async execute(command: AuthenticateUserCommand): Promise<IssuedToken> {
    const user = await this.userRepo.findByEmail(Email.create(command.email));

    if (!user) {
      // R1: verify against a decoy so "unknown email" costs as much as "wrong password"
      await this.passwordHasher.verify(command.password, await this.decoy());
      throw new UnauthenticatedException();
    }

    const matches = await this.passwordHasher.verify(
      command.password,
      user.passwordHash,
    );
    // R1 + R2: wrong password and a disabled account are the same failure to the caller
    if (!matches || !user.isActive) {
      throw new UnauthenticatedException();
    }

    return this.tokenService.issue(user);
  }

  private decoy(): Promise<string> {
    this.decoyHash ??= this.passwordHasher.hash(crypto.randomUUID());
    return this.decoyHash;
  }
}
