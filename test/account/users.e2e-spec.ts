import { INestApplication } from '@nestjs/common';
import { createTestApp } from '../helpers/test-app';
import { truncateAll } from '../helpers/db';
import { PrismaService } from '../../src/shared/infrastructure/prisma/prisma.service';
import { DuplicateEntityException } from '../../src/shared/domain/exceptions';
import { Email } from '../../src/modules/account/domain/email';
import { User } from '../../src/modules/account/domain/user.entity';
import { UserRepository } from '../../src/modules/account/application/user.repository';
import { PasswordHasher } from '../../src/modules/account/application/password-hasher';
import { AdminBootstrapService } from '../../src/modules/account/infrastructure/admin-bootstrap.service';

const ADMIN_EMAIL = 'Admin@Example.com';
const ADMIN_PASSWORD = 'bootstrap-password-1';

describe('Users — DOMAIN-SPEC-2-AUTH § 2.1', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let users: UserRepository;
  let hasher: PasswordHasher;

  beforeAll(async () => {
    process.env.BOOTSTRAP_ADMIN_EMAIL = ADMIN_EMAIL;
    process.env.BOOTSTRAP_ADMIN_PASSWORD = ADMIN_PASSWORD;
    const context = await createTestApp();
    app = context.app;
    prisma = context.prisma;
    users = app.get(UserRepository);
    hasher = app.get(PasswordHasher);
  });

  afterAll(async () => {
    await truncateAll(prisma);
    await app.close();
    delete process.env.BOOTSTRAP_ADMIN_EMAIL;
    delete process.env.BOOTSTRAP_ADMIN_PASSWORD;
  });

  beforeEach(async () => {
    await truncateAll(prisma);
  });

  const newUser = (email: string): Promise<void> =>
    hasher.hash('a-password-123').then((passwordHash) =>
      users.save(
        new User({
          email: Email.create(email),
          passwordHash,
          firstName: 'Lan',
          lastName: 'Nguyen',
          tokenKey: 'f'.repeat(64),
        }),
      ),
    );

  it('1. stores Lan@Example.com as lan@example.com and finds it by LAN@example.COM', async () => {
    await newUser('Lan@Example.com');

    const row = await prisma.user.findFirstOrThrow();
    expect(row.email).toBe('lan@example.com');
    expect(row.role).toBe('customer');

    const found = await users.findByEmail(Email.create('LAN@example.COM'));
    expect(found?.email.value).toBe('lan@example.com');
    expect(await users.findById(row.id)).not.toBeNull();
  });

  it('2. rejects a second user whose email differs only by case', async () => {
    await newUser('lan@example.com');

    await expect(newUser('LAN@Example.com')).rejects.toBeInstanceOf(
      DuplicateEntityException,
    );
    expect(await prisma.user.count()).toBe(1);
  });

  it('3. creates exactly one admin when the bootstrap runs twice', async () => {
    const bootstrap = app.get(AdminBootstrapService);

    await bootstrap.onApplicationBootstrap();
    await bootstrap.onApplicationBootstrap();

    const admins = await prisma.user.findMany();
    expect(admins).toHaveLength(1);
    expect(admins[0]).toMatchObject({
      email: 'admin@example.com',
      role: 'admin',
      isActive: true,
    });
    expect(admins[0].tokenKey).toMatch(/^[0-9a-f]{64}$/);
    // R2: only a verifiable hash is stored
    expect(admins[0].passwordHash).not.toBe(ADMIN_PASSWORD);
    await expect(
      hasher.verify(ADMIN_PASSWORD, admins[0].passwordHash),
    ).resolves.toBe(true);
  });

  it('3b. keeps a single admin when two instances bootstrap at the same time', async () => {
    const bootstrap = app.get(AdminBootstrapService);

    await Promise.all([
      bootstrap.onApplicationBootstrap(),
      bootstrap.onApplicationBootstrap(),
    ]);

    expect(await prisma.user.count()).toBe(1);
  });

  it('rejects an unknown role at the database (CHECK constraint)', async () => {
    await expect(
      prisma.$executeRaw`INSERT INTO users (id, email, password_hash, first_name, last_name, role, token_key, updated_at)
        VALUES ('x', 'x@example.com', 'h', 'X', 'X', 'superuser', 'k', now())`,
    ).rejects.toThrow();
  });
});

describe('Users — bootstrap skipped without variables', () => {
  it('creates no admin when BOOTSTRAP_ADMIN_* are empty', async () => {
    process.env.BOOTSTRAP_ADMIN_EMAIL = '';
    process.env.BOOTSTRAP_ADMIN_PASSWORD = '';
    const { app, prisma } = await createTestApp();
    try {
      await truncateAll(prisma);
      await app.get(AdminBootstrapService).onApplicationBootstrap();
      expect(await prisma.user.count()).toBe(0);
    } finally {
      await app.close();
      delete process.env.BOOTSTRAP_ADMIN_EMAIL;
      delete process.env.BOOTSTRAP_ADMIN_PASSWORD;
    }
  });
});
