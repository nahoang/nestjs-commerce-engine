import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

function getAppVersion(): string {
  try {
    const pkgPath = path.resolve(process.cwd(), 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as {
      version?: string;
    };
    return typeof pkg.version === 'string' ? pkg.version : '0.0.1';
  } catch {
    return '0.0.1';
  }
}

const appVersion = getAppVersion();

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(): Promise<{ status: string; version: string; error?: string }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'healthy',
        version: appVersion,
      };
    } catch (error) {
      throw new HttpException(
        {
          status: 'unhealthy',
          version: appVersion,
          error:
            error instanceof Error
              ? error.message
              : 'Database connection error',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
