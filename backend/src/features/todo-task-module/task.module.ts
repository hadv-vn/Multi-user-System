import { Module } from '@nestjs/common';

import { RbacModule } from '../../rbac/rbac.module.js';
import { SessionModule } from '../../session/session.module.js';

import { AdminTaskStatisticsController } from './admin-task-statistics.controller.js';
import { PrismaTaskStatisticsRepository } from './repositories/prisma-task-statistics.repository.js';
import { PrismaTaskRepository } from './repositories/prisma-task.repository.js';
import { TASK_STATISTICS_REPOSITORY } from './repositories/task-statistics-repository.interface.js';
import { TASK_REPOSITORY } from './repositories/task-repository.interface.js';
import { TaskStatisticsService } from './task-statistics.service.js';
import { TaskController } from './task.controller.js';
import { TaskService } from './task.service.js';

@Module({
  imports: [SessionModule, RbacModule],
  controllers: [TaskController, AdminTaskStatisticsController],
  providers: [
    TaskService,
    TaskStatisticsService,
    { provide: TASK_REPOSITORY, useClass: PrismaTaskRepository },
    { provide: TASK_STATISTICS_REPOSITORY, useClass: PrismaTaskStatisticsRepository },
  ],
})
export class TaskModule {}
