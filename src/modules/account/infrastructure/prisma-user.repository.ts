import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { DuplicateEntityException } from '../../../shared/domain/exceptions';
import { uniqueViolationTargets } from '../../../shared/infrastructure/prisma/prisma-errors';
import { UserRepository } from '../application/user.repository';
import { Email } from '../domain/email';
import { User } from '../domain/user.entity';
import { UserMapper } from './user.mapper';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {}

  async findById(id: string): Promise<User | null> {
    const record = await this.txHost.tx.user.findUnique({ where: { id } });
    return record ? UserMapper.toDomain(record) : null;
  }

  async findByEmail(email: Email): Promise<User | null> {
    const record = await this.txHost.tx.user.findUnique({
      where: { email: email.value },
    });
    return record ? UserMapper.toDomain(record) : null;
  }

  // Email and role are never rewritten on update
  async save(user: User): Promise<void> {
    const data = UserMapper.toPersistence(user);
    try {
      await this.txHost.tx.user.upsert({
        where: { id: user.id },
        create: data,
        update: {
          passwordHash: data.passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          isActive: data.isActive,
          tokenKey: data.tokenKey,
          updatedAt: data.updatedAt,
        },
      });
    } catch (error) {
      if (uniqueViolationTargets(error) !== null) {
        throw new DuplicateEntityException(
          'A user with this email already exists',
        );
      }
      throw error;
    }
  }
}
