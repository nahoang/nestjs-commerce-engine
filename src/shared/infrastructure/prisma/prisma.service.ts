import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient<Prisma.PrismaClientOptions, 'query'>
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // Emit query events (no console output) so tests can count statements per request
    super({ log: [{ emit: 'event', level: 'query' }] });
  }

  async onModuleInit(): Promise<void> {
    // Opt-in SQL tracing for local debugging: LOG_SQL=true pnpm start:dev
    if (process.env.LOG_SQL === 'true') {
      this.$on('query', (event) => {
        this.logger.debug(
          `${event.query} -- params=${event.params} (${event.duration}ms)`,
        );
      });
    }
    try {
      await this.$connect();
    } catch (error) {
      this.logger.warn(
        `Failed to connect to database during initialization: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
