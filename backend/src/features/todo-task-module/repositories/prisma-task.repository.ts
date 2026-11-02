import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../common/prisma/prisma.service.js';
import { TASK_DEFAULT_STATUS } from '../task-status.constants.js';

import { TaskRecord } from './task-record.interface.js';
import {
  CreateTaskData,
  TaskRepository,
  UpdateTaskDetailsData,
} from './task-repository.interface.js';

@Injectable()
export class PrismaTaskRepository implements TaskRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<TaskRecord | null> {
    return this.prisma.task.findUnique({ where: { id } });
  }

  async findManyByUser(userId: string, status?: string): Promise<TaskRecord[]> {
    return this.prisma.task.findMany({
      where: { userId, ...(status !== undefined ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(userId: string, data: CreateTaskData): Promise<TaskRecord> {
    return this.prisma.task.create({
      data: {
        userId,
        title: data.title,
        description: data.description ?? null,
        status: TASK_DEFAULT_STATUS,
      },
    });
  }

  async updateDetails(id: string, data: UpdateTaskDetailsData): Promise<TaskRecord> {
    return this.prisma.task.update({
      where: { id },
      data: { title: data.title, description: data.description },
    });
  }

  async updateStatus(id: string, status: string): Promise<TaskRecord> {
    return this.prisma.task.update({ where: { id }, data: { status } });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.task.delete({ where: { id } });
  }
}
