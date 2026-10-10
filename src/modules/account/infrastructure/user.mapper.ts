import { Prisma, User as PrismaUser } from '@prisma/client';
import { Email } from '../domain/email';
import { parseRole } from '../domain/role';
import { User } from '../domain/user.entity';

/** Separates the Prisma persistence model from the User domain entity. */
export class UserMapper {
  static toDomain(record: PrismaUser): User {
    return new User({
      id: record.id,
      email: Email.create(record.email),
      passwordHash: record.passwordHash,
      firstName: record.firstName,
      lastName: record.lastName,
      role: parseRole(record.role),
      isActive: record.isActive,
      tokenKey: record.tokenKey,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  static toPersistence(entity: User): Prisma.UserUncheckedCreateInput {
    return {
      id: entity.id,
      email: entity.email.value,
      passwordHash: entity.passwordHash,
      firstName: entity.firstName,
      lastName: entity.lastName,
      role: entity.role,
      isActive: entity.isActive,
      tokenKey: entity.tokenKey,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
