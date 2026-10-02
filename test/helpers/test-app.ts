import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { PrismaService } from '../../src/shared/infrastructure/prisma/prisma.service';

export interface TestAppContext {
  app: INestApplication;
  prisma: PrismaService;
}

export async function createTestApp(): Promise<TestAppContext> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  configureApp(app);
  await app.init();

  const prisma = app.get<PrismaService>(PrismaService);

  return { app, prisma };
}
