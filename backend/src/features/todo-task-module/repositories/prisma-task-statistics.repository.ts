import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../common/prisma/prisma.service.js';

import {
  TaskStatisticsOverviewFilter,
  TaskStatisticsOverviewRecord,
  UserTaskStatisticsRecord,
} from './task-statistics-record.interface.js';
import { TaskStatisticsRepository } from './task-statistics-repository.interface.js';
import { summarizeTaskStatusCounts } from './task-status-summary.js';

// Mọi truy vấn ở đây chỉ dùng groupBy/aggregate/count trên bảng tasks —
// không bao giờ đọc cột title/description (SRS A-3).
@Injectable()
export class PrismaTaskStatisticsRepository implements TaskStatisticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUserStatistics(userId: string): Promise<UserTaskStatisticsRecord | null> {
    const [user, statusGroups, latest] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
      this.prisma.task.groupBy({ by: ['status'], where: { userId }, _count: { _all: true } }),
      this.prisma.task.aggregate({ where: { userId }, _max: { createdAt: true } }),
    ]);

    if (user === null) {
      return null;
    }

    const summary = summarizeTaskStatusCounts(
      statusGroups.map((group) => ({ status: group.status, count: group._count._all })),
    );
    return { userId, ...summary, lastCreatedAt: latest._max.createdAt };
  }

  async findOverview(filter: TaskStatisticsOverviewFilter): Promise<TaskStatisticsOverviewRecord> {
    const userWhere = filter.email
      ? { email: { contains: filter.email, mode: 'insensitive' as const } }
      : {};

    const [systemGroups, totalItems, users] = await Promise.all([
      this.prisma.task.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.user.count({ where: userWhere }),
      this.prisma.user.findMany({
        where: userWhere,
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
        orderBy: [{ tasks: { _count: 'desc' } }, { email: 'asc' }],
        select: { id: true, email: true },
      }),
    ]);

    const userIds = users.map((user) => user.id);
    const perUserGroups =
      userIds.length === 0
        ? []
        : await this.prisma.task.groupBy({
            by: ['userId', 'status'],
            where: { userId: { in: userIds } },
            _count: { _all: true },
          });

    const countsByUserId = new Map<string, { status: string; count: number }[]>();
    for (const group of perUserGroups) {
      const counts = countsByUserId.get(group.userId) ?? [];
      counts.push({ status: group.status, count: group._count._all });
      countsByUserId.set(group.userId, counts);
    }

    return {
      summary: summarizeTaskStatusCounts(
        systemGroups.map((group) => ({ status: group.status, count: group._count._all })),
      ),
      items: users.map((user) => ({
        userId: user.id,
        email: user.email,
        ...summarizeTaskStatusCounts(countsByUserId.get(user.id) ?? []),
      })),
      totalItems,
    };
  }
}
