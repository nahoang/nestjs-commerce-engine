import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DuplicateEntityException } from '../../../shared/domain/exceptions';
import { AppConfigService } from '../../../shared/infrastructure/config/app-config.service';
import { BootstrapAdminUseCase } from '../application/bootstrap-admin.use-case';

/** Seeds the first admin from BOOTSTRAP_ADMIN_* at startup; idempotent across restarts. */
@Injectable()
export class AdminBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminBootstrapService.name);

  constructor(
    private readonly config: AppConfigService,
    private readonly bootstrapAdmin: BootstrapAdminUseCase,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const email = this.config.bootstrapAdminEmail;
    const password = this.config.bootstrapAdminPassword;
    if (!email || !password) {
      return;
    }

    try {
      const result = await this.bootstrapAdmin.execute({ email, password });
      this.logger.log(
        result === 'created'
          ? 'Bootstrap admin created'
          : 'Bootstrap admin already exists, skipped',
      );
    } catch (error) {
      // Another instance inserted the same email between our read and write
      if (error instanceof DuplicateEntityException) {
        this.logger.log('Bootstrap admin already exists, skipped');
        return;
      }
      throw error;
    }
  }
}
