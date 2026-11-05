import { Inject, Injectable } from '@nestjs/common';

import { TaskStatisticsUserNotFoundException } from './exceptions/task-statistics-user-not-found.exception.js';
import {
  TaskOverviewUserRecord,
  TaskStatisticsOverviewFilter,
  UserTaskStatisticsRecord,
} from './repositories/task-statistics-record.interface.js';
import {
  TASK_STATISTICS_REPOSITORY,
  type TaskStatisticsRepository,
} from './repositories/task-statistics-repository.interface.js';
import type { TaskStatusSummary } from './repositories/task-status-summary.js';

export interface PaginatedTaskStatisticsOverview {
  summary: TaskStatusSummary;
  items: TaskOverviewUserRecord[];
  meta: { page: number; limit: number; totalItems: number; totalPages: number };
}

@Injectable()
export class TaskStatisticsService {
  constructor(
    @Inject(TASK_STATISTICS_REPOSITORY)
    private readonly taskStatisticsRepository: TaskStatisticsRepository,
  ) {}

  async getUserStatistics(userId: string): Promise<UserTaskStatisticsRecord> {
    const statistics = await this.taskStatisticsRepository.findUserStatistics(userId);
    if (statistics === null) {
      throw new TaskStatisticsUserNotFoundException();
    }
    return statistics;
  }

  async getOverview(
    filter: TaskStatisticsOverviewFilter,
  ): Promise<PaginatedTaskStatisticsOverview> {
    const { summary, items, totalItems } = await this.taskStatisticsRepository.findOverview(filter);
    return {
      summary,
      items,
      meta: {
        page: filter.page,
        limit: filter.limit,
        totalItems,
        totalPages: Math.ceil(totalItems / filter.limit),
      },
    };
  }
}
