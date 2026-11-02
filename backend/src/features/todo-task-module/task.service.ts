import { Inject, Injectable } from '@nestjs/common';

import { CreateTaskDto } from './dto/create-task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';
import { TaskForbiddenException } from './exceptions/task-forbidden.exception.js';
import { TaskNotFoundException } from './exceptions/task-not-found.exception.js';
import { TaskRecord } from './repositories/task-record.interface.js';
import { TASK_REPOSITORY, type TaskRepository } from './repositories/task-repository.interface.js';
import { TaskResult } from './task-result.interface.js';

@Injectable()
export class TaskService {
  constructor(@Inject(TASK_REPOSITORY) private readonly taskRepository: TaskRepository) {}

  async create(userId: string, dto: CreateTaskDto): Promise<TaskResult> {
    const task = await this.taskRepository.create(userId, {
      title: dto.title,
      description: dto.description ?? null,
    });
    return this.toResult(task);
  }

  async list(userId: string, status?: string): Promise<TaskResult[]> {
    const tasks = await this.taskRepository.findManyByUser(userId, status);
    return tasks.map((task) => this.toResult(task));
  }

  async getById(userId: string, taskId: string): Promise<TaskResult> {
    const task = await this.findOwnedTaskOrThrow(userId, taskId);
    return this.toResult(task);
  }

  async update(userId: string, taskId: string, dto: UpdateTaskDto): Promise<TaskResult> {
    const task = await this.findOwnedTaskOrThrow(userId, taskId);

    // `Object.hasOwn` — phân biệt field THỰC SỰ có trong JSON body (kể cả
    // giá trị null) với field hoàn toàn không gửi (xem UpdateTaskDto).
    let updated = task;
    if (Object.hasOwn(dto, 'title')) {
      updated = await this.taskRepository.updateDetails(taskId, {
        title: dto.title ?? task.title,
        description: Object.hasOwn(dto, 'description')
          ? (dto.description ?? null)
          : task.description,
      });
    }
    if (Object.hasOwn(dto, 'status') && dto.status !== undefined) {
      updated = await this.taskRepository.updateStatus(taskId, dto.status);
    }

    return this.toResult(updated);
  }

  async remove(userId: string, taskId: string): Promise<void> {
    await this.findOwnedTaskOrThrow(userId, taskId);
    await this.taskRepository.delete(taskId);
  }

  /** Tách 404 (không tồn tại) vs 403 (tồn tại nhưng thuộc user khác). */
  private async findOwnedTaskOrThrow(userId: string, taskId: string): Promise<TaskRecord> {
    const task = await this.taskRepository.findById(taskId);
    if (task === null) {
      throw new TaskNotFoundException();
    }
    if (task.userId !== userId) {
      throw new TaskForbiddenException();
    }
    return task;
  }

  private toResult(task: TaskRecord): TaskResult {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }
}
