import { Module } from '@nestjs/common';

import { SessionModule } from '../../session/session.module.js';

import { PrismaTaskRepository } from './repositories/prisma-task.repository.js';
import { TASK_REPOSITORY } from './repositories/task-repository.interface.js';
import { TaskController } from './task.controller.js';
import { TaskService } from './task.service.js';

@Module({
  imports: [SessionModule],
  controllers: [TaskController],
  providers: [TaskService, { provide: TASK_REPOSITORY, useClass: PrismaTaskRepository }],
})
export class TaskModule {}
