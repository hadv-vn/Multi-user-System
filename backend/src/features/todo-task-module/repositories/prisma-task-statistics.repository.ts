import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../common/prisma/prisma.service.js';
import { TASK_STATUS_VALUES, type TaskStatus } from '../task-status.constants.js';

import { UserTaskStatisticsRecord } from './task-statistics-record.interface.js';
import { TaskStatisticsRepository } from './task-statistics-repository.interface.js';

@Injectable()
export class PrismaTaskStatisticsRepository implements TaskStatisticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUserStatistics(userId: string): Promise<UserTaskStatisticsRecord | null> {
    // Chỉ dùng groupBy/aggregate — không bao giờ đọc cột title/description.
    const [user, statusGroups, latest] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
      this.prisma.task.groupBy({ by: ['status'], where: { userId }, _count: { _all: true } }),
      this.prisma.task.aggregate({ where: { userId }, _max: { createdAt: true } }),
    ]);

    if (user === null) {
      return null;
    }

    const byStatus = Object.fromEntries(TASK_STATUS_VALUES.map((status) => [status, 0])) as Record<
      TaskStatus,
      number
    >;
    let total = 0;
    for (const group of statusGroups) {
      total += group._count._all;
      if (this.isKnownStatus(group.status)) {
        byStatus[group.status] = group._count._all;
      }
    }

    return { userId, total, byStatus, lastCreatedAt: latest._max.createdAt };
  }

  private isKnownStatus(status: string): status is TaskStatus {
    return (TASK_STATUS_VALUES as readonly string[]).includes(status);
  }
}
