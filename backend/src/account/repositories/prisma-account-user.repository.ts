import { Injectable } from '@nestjs/common';

import type { PrismaTx } from '../../common/prisma/prisma-transaction.type.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';

import { AccountUserRecord } from './account-user-record.interface.js';
import { AccountUserRepository } from './account-user-repository.interface.js';

const DEACTIVATED_STATUS = 'DEACTIVATED';

@Injectable()
export class PrismaAccountUserRepository implements AccountUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(userId: string): Promise<AccountUserRecord | null> {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  async updateName(userId: string, name: string): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { name } });
  }

  async updatePasswordHash(userId: string, newPasswordHash: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });
  }

  async deactivate(tx: PrismaTx, userId: string): Promise<void> {
    await tx.user.update({
      where: { id: userId },
      data: { status: DEACTIVATED_STATUS, disabledAt: new Date() },
    });
  }
}
