import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../common/prisma/prisma.service.js';
import { TASK_DEFAULT_PRIORITY } from '../task-priority.constants.js';
import { TASK_DEFAULT_STATUS } from '../task-status.constants.js';

import { TaskRecord } from './task-record.interface.js';
import {
  CreateTaskData,
  SortKeyRange,
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
      orderBy: { sortKey: 'asc' },
    });
  }

  async create(userId: string, data: CreateTaskData): Promise<TaskRecord> {
    return this.prisma.task.create({
      data: {
        userId,
        title: data.title,
        description: data.description ?? null,
        status: TASK_DEFAULT_STATUS,
        sortKey: data.sortKey,
        categoryId: data.categoryId ?? null,
        dueDate: data.dueDate ?? null,
        priority: data.priority ?? TASK_DEFAULT_PRIORITY,
      },
    });
  }

  async updateDetails(id: string, data: UpdateTaskDetailsData): Promise<TaskRecord> {
    return this.prisma.task.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        categoryId: data.categoryId,
        dueDate: data.dueDate,
        priority: data.priority,
      },
    });
  }

  async updateStatus(id: string, status: string): Promise<TaskRecord> {
    return this.prisma.task.update({ where: { id }, data: { status } });
  }

  async updateSortKey(id: string, sortKey: number): Promise<TaskRecord> {
    return this.prisma.task.update({ where: { id }, data: { sortKey } });
  }

  async findSortKeyRange(userId: string): Promise<SortKeyRange | null> {
    const result = await this.prisma.task.aggregate({
      where: { userId },
      _min: { sortKey: true },
      _max: { sortKey: true },
    });
    if (result._min.sortKey === null || result._max.sortKey === null) {
      return null;
    }
    return { min: result._min.sortKey, max: result._max.sortKey };
  }

  async delete(id: string): Promise<void> {
    await this.prisma.task.delete({ where: { id } });
  }
}
