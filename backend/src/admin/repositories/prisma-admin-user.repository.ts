import { Injectable } from '@nestjs/common';

import type { PrismaTx } from '../../common/prisma/prisma-transaction.type.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { ROLE_NAME, type RoleName } from '../../rbac/role.constants.js';

import {
  AdminTargetUserRecord,
  AdminUserListItemRecord,
  ListUsersFilter,
  ListUsersResult,
} from './admin-user-record.interface.js';
import { AdminUserRepository } from './admin-user-repository.interface.js';

@Injectable()
export class PrismaAdminUserRepository implements AdminUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findManyWithFilters(params: ListUsersFilter): Promise<ListUsersResult> {
    const where = params.email
      ? { email: { contains: params.email, mode: 'insensitive' as const } }
      : {};

    const [users, totalItems] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          userRoles: { orderBy: { assignedAt: 'desc' }, take: 1, include: { role: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const items: AdminUserListItemRecord[] = users.map((user) => ({
      id: user.id,
      email: user.email,
      role: user.userRoles[0]?.role.name ?? ROLE_NAME.USER,
      status: user.status,
      createdAt: user.createdAt,
    }));

    return { items, totalItems };
  }

  async findTargetForModeration(
    tx: PrismaTx,
    userId: string,
  ): Promise<AdminTargetUserRecord | null> {
    const user = await tx.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: { orderBy: { assignedAt: 'desc' }, take: 1, include: { role: true } },
      },
    });

    if (user === null) {
      return null;
    }

    return {
      id: user.id,
      status: user.status,
      roleName: user.userRoles[0]?.role.name ?? ROLE_NAME.USER,
    };
  }

  async updateStatus(tx: PrismaTx, userId: string, newStatus: string): Promise<void> {
    await tx.user.update({ where: { id: userId }, data: { status: newStatus } });
  }

  async changeUserRole(tx: PrismaTx, userId: string, newRoleName: RoleName): Promise<void> {
    const newRole = await tx.role.findUniqueOrThrow({ where: { name: newRoleName } });

    // Đúng 1 role/user enforce ở tầng service (data-model: không UNIQUE(user_id) cứng ở DB).
    await tx.userRole.deleteMany({ where: { userId } });
    await tx.userRole.create({ data: { userId, roleId: newRole.id } });
  }
}
