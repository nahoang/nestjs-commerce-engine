import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppConfigService } from '../../shared/infrastructure/config/app-config.service';
import { PrismaModule } from '../../shared/infrastructure/prisma/prisma.module';
import { AuthController } from './api/auth.controller';
import { JwtAuthGuard } from './api/jwt-auth.guard';
import { RolesGuard } from './api/roles.guard';
import { AuthenticateUserUseCase } from './application/authenticate-user.use-case';
import { BootstrapAdminUseCase } from './application/bootstrap-admin.use-case';
import { ChangePasswordUseCase } from './application/change-password.use-case';
import { PasswordHasher } from './application/password-hasher';
import { RegisterUserUseCase } from './application/register-user.use-case';
import { TokenKeyGenerator } from './application/token-key-generator';
import { TokenService } from './application/token-service';
import { UserRepository } from './application/user.repository';
import { AdminBootstrapService } from './infrastructure/admin-bootstrap.service';
import { Argon2PasswordHasher } from './infrastructure/argon2-password-hasher';
import { JwtTokenService } from './infrastructure/jwt-token.service';
import { PrismaUserRepository } from './infrastructure/prisma-user.repository';
import { RandomTokenKeyGenerator } from './infrastructure/random-token-key.generator';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        secret: config.secretKey,
        signOptions: { algorithm: 'HS256' },
      }),
    }),
    // Counters live in this process's memory: with several instances each one
    // counts on its own, so the effective limit grows; use a shared (Redis) storage then.
    // The guard is attached to the login route only; nothing else is throttled.
    ThrottlerModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        errorMessage: 'Too many login attempts, try again later',
        throttlers: [
          {
            name: 'default',
            ttl: config.loginRateWindowSeconds * 1000,
            limit: config.loginRateLimit,
          },
        ],
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    BootstrapAdminUseCase,
    RegisterUserUseCase,
    AuthenticateUserUseCase,
    ChangePasswordUseCase,
    // Global guards run in registration order: authenticate first, then authorize
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    AdminBootstrapService,
    { provide: UserRepository, useClass: PrismaUserRepository },
    { provide: PasswordHasher, useClass: Argon2PasswordHasher },
    { provide: TokenKeyGenerator, useClass: RandomTokenKeyGenerator },
    { provide: TokenService, useClass: JwtTokenService },
  ],
  exports: [UserRepository, PasswordHasher, TokenKeyGenerator, TokenService],
})
export class AccountModule {}
