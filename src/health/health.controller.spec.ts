import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../shared/infrastructure/prisma/prisma.service';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('HealthController', () => {
  let controller: HealthController;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return 200 healthy when database is reachable', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([{ '?column?': 1 }]);

    const response = await controller.check();
    expect(response).toEqual({
      status: 'healthy',
      version: '0.0.1',
    });
  });

  it('should throw 503 unhealthy when database query fails', async () => {
    (prisma.$queryRaw as jest.Mock).mockRejectedValueOnce(
      new Error('Connection refused'),
    );

    try {
      await controller.check();
      throw new Error('Expected HttpException to be thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      const httpException = error as HttpException;
      expect(httpException.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(httpException.getResponse()).toMatchObject({
        status: 'unhealthy',
        version: '0.0.1',
      });
    }
  });
});
