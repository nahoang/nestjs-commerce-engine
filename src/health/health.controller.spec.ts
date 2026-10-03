import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('HealthController', () => {
  let controller: HealthController;
  let mockPrisma: { $queryRaw: jest.Mock };

  beforeEach(async () => {
    mockPrisma = {
      $queryRaw: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [PrismaService],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return 200 healthy when database is reachable', async () => {
    mockPrisma.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);

    const response = await controller.check();
    expect(response.status).toBe('healthy');
    expect(typeof response.version).toBe('string');
  });

  it('should throw 503 unhealthy when database query fails', async () => {
    mockPrisma.$queryRaw.mockRejectedValueOnce(new Error('Connection refused'));

    try {
      await controller.check();
      throw new Error('Expected HttpException to be thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      const httpException = error as HttpException;
      const body = httpException.getResponse() as Record<string, unknown>;
      expect(httpException.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(body.status).toBe('unhealthy');
      expect(typeof body.version).toBe('string');
    }
  });
});
