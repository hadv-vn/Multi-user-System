import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service.js';

import {
  CreateUserData,
  FailedLoginAttemptResult,
  UserRecord,
  USER_STATUS,
} from './user-record.interface.js';
import { UserRepository } from './user-repository.interface.js';

const DEFAULT_ROLE_NAME = 'USER';
const BRUTE_FORCE_MAX_ATTEMPTS = 5;
const BRUTE_FORCE_LOCK_MINUTES = 15;

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(userId: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  async createWithDefaultRole(data: CreateUserData): Promise<UserRecord> {
    return this.prisma.$transaction(async (tx) => {
      const defaultRole = await tx.role.findUniqueOrThrow({
        where: { name: DEFAULT_ROLE_NAME },
      });

      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash: data.passwordHash,
          status: USER_STATUS.PENDING_VERIFICATION,
        },
      });

      await tx.userRole.create({
        data: { userId: user.id, roleId: defaultRole.id },
      });

      return user;
    });
  }

  async markEmailVerified(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
    });
  }

  async updatePasswordHash(userId: string, newPasswordHash: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });
  }

  async registerFailedLoginAttempt(userId: string): Promise<FailedLoginAttemptResult> {
    // Atomic increment + set lockedUntil có điều kiện trong CÙNG 1 câu lệnh
    // (tránh lost-update khi nhiều request sai mật khẩu đồng thời, C-5).
    const rows = await this.prisma.$queryRaw<
      { failed_login_attempts: number; locked_until: Date | null }[]
    >`
      UPDATE users
      SET failed_login_attempts = failed_login_attempts + 1,
          locked_until = CASE
            WHEN failed_login_attempts + 1 >= ${BRUTE_FORCE_MAX_ATTEMPTS}
              THEN now() + (${BRUTE_FORCE_LOCK_MINUTES} || ' minutes')::interval
            ELSE locked_until
          END
      WHERE id = ${userId}::uuid
      RETURNING failed_login_attempts, locked_until
    `;

    const row = rows[0];
    return {
      attempts: row?.failed_login_attempts ?? 0,
      lockedUntil: row?.locked_until ?? null,
    };
  }

  async resetFailedLoginAttempts(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }
}
