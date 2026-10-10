import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/infrastructure/prisma/prisma.module';
import { AuthController } from './api/auth.controller';
import { BootstrapAdminUseCase } from './application/bootstrap-admin.use-case';
import { RegisterUserUseCase } from './application/register-user.use-case';
import { PasswordHasher } from './application/password-hasher';
import { TokenKeyGenerator } from './application/token-key-generator';
import { UserRepository } from './application/user.repository';
import { AdminBootstrapService } from './infrastructure/admin-bootstrap.service';
import { Argon2PasswordHasher } from './infrastructure/argon2-password-hasher';
import { PrismaUserRepository } from './infrastructure/prisma-user.repository';
import { RandomTokenKeyGenerator } from './infrastructure/random-token-key.generator';

@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [
    BootstrapAdminUseCase,
    RegisterUserUseCase,
    AdminBootstrapService,
    { provide: UserRepository, useClass: PrismaUserRepository },
    { provide: PasswordHasher, useClass: Argon2PasswordHasher },
    { provide: TokenKeyGenerator, useClass: RandomTokenKeyGenerator },
  ],
  exports: [UserRepository, PasswordHasher, TokenKeyGenerator],
})
export class AccountModule {}
