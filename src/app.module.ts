import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClsModule } from 'nestjs-cls';
import { randomUUID } from 'node:crypto';
import { Request, Response } from 'express';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './shared/infrastructure/prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { validate, AppConfigModule } from './shared/infrastructure/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    AppConfigModule,
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        generateId: true,
        idGenerator: (req: Request) => {
          const rawHeader = req.headers?.['x-request-id'];
          const headerId = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
          if (headerId && typeof headerId === 'string' && headerId.trim()) {
            return headerId.trim();
          }
          return randomUUID();
        },
        setup: (cls, _req: Request, res: Response) => {
          const id = cls.getId();
          if (res && typeof res.setHeader === 'function') {
            res.setHeader('X-Request-ID', id);
          }
        },
      },
    }),
    PrismaModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
