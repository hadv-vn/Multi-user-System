import { Inject, Injectable } from '@nestjs/common';

import { TaskStatisticsUserNotFoundException } from './exceptions/task-statistics-user-not-found.exception.js';
import { UserTaskStatisticsRecord } from './repositories/task-statistics-record.interface.js';
import {
  TASK_STATISTICS_REPOSITORY,
  type TaskStatisticsRepository,
} from './repositories/task-statistics-repository.interface.js';

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
}
