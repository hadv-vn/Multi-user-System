import { BadRequestException, Inject, Injectable } from '@nestjs/common';

import { CategoryService } from './category.service.js';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { ReorderTaskDto } from './dto/reorder-task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';
import { TaskForbiddenException } from './exceptions/task-forbidden.exception.js';
import { TaskNotFoundException } from './exceptions/task-not-found.exception.js';
import { DEFAULT_INSERT_POSITION, SORT_KEY_GAP } from './insert-position.constants.js';
import { TaskRecord } from './repositories/task-record.interface.js';
import { TASK_REPOSITORY, type TaskRepository } from './repositories/task-repository.interface.js';
import { TaskResult } from './task-result.interface.js';

@Injectable()
export class TaskService {
  constructor(
    @Inject(TASK_REPOSITORY) private readonly taskRepository: TaskRepository,
    private readonly categoryService: CategoryService,
  ) {}

  async create(userId: string, dto: CreateTaskDto): Promise<TaskResult> {
    if (dto.categoryId !== undefined) {
      await this.validateCategoryOrThrow(userId, dto.categoryId);
    }
    const sortKey = await this.computeInsertSortKey(userId, dto.insertPosition);
    const task = await this.taskRepository.create(userId, {
      title: dto.title,
      description: dto.description ?? null,
      sortKey,
      categoryId: dto.categoryId,
      dueDate: dto.dueDate !== undefined ? new Date(dto.dueDate) : undefined,
      priority: dto.priority,
    });
    return this.toResult(task);
  }

  /**
   * docs/Task_Category_ToDo.md mục 4.5 — categoryId tham chiếu qua body (không phải path) -> coi
   * không tồn tại/không thuộc user này là lỗi INPUT (400 VALIDATION_ERROR), KHÔNG phải 403/404 như
   * thao tác trực tiếp lên category qua `CategoryController` — cùng quyết định đã áp dụng cho
   * afterTaskId/beforeTaskId ở docs/Task_Reorder_ToDo.md mục 4.2.
   */
  private async validateCategoryOrThrow(userId: string, categoryId: string): Promise<void> {
    const category = await this.categoryService.findOwnedOrNull(userId, categoryId);
    if (category === null) {
      throw new BadRequestException('categoryId không hợp lệ hoặc không thuộc về bạn.');
    }
  }

  /** docs/Task_Reorder_ToDo.md mục 4.3 — 'top'/không gửi -> min - GAP; 'bottom' -> max + GAP. */
  private async computeInsertSortKey(userId: string, insertPosition?: string): Promise<number> {
    const position = insertPosition ?? DEFAULT_INSERT_POSITION;
    const range = await this.taskRepository.findSortKeyRange(userId);
    if (range === null) {
      return SORT_KEY_GAP;
    }
    return position === 'bottom' ? range.max + SORT_KEY_GAP : range.min - SORT_KEY_GAP;
  }

  /**
   * docs/Task_Reorder_ToDo.md mục 4.2 — server tự tính sortKey từ sortKey THẬT của 2 hàng xóm đọc
   * từ DB, không nhận trực tiếp giá trị sortKey từ client (tránh tin dữ liệu client có thể đang
   * cache cũ/tính sai).
   */
  async reorder(userId: string, taskId: string, dto: ReorderTaskDto): Promise<TaskResult> {
    const task = await this.findOwnedTaskOrThrow(userId, taskId);

    const afterSortKey =
      dto.afterTaskId != null ? await this.findReferencedSortKeyOrThrow(userId, dto.afterTaskId) : null;
    const beforeSortKey =
      dto.beforeTaskId != null ? await this.findReferencedSortKeyOrThrow(userId, dto.beforeTaskId) : null;

    const newSortKey = this.computeReorderSortKey(task.sortKey, afterSortKey, beforeSortKey);
    const updated = await this.taskRepository.updateSortKey(taskId, newSortKey);
    return this.toResult(updated);
  }

  private computeReorderSortKey(
    currentSortKey: number,
    afterSortKey: number | null,
    beforeSortKey: number | null,
  ): number {
    if (afterSortKey !== null && beforeSortKey !== null) {
      return (afterSortKey + beforeSortKey) / 2;
    }
    if (afterSortKey !== null) {
      return afterSortKey + SORT_KEY_GAP;
    }
    if (beforeSortKey !== null) {
      return beforeSortKey - SORT_KEY_GAP;
    }
    return currentSortKey;
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
    if (dto.categoryId !== undefined && dto.categoryId !== null) {
      await this.validateCategoryOrThrow(userId, dto.categoryId);
    }

    // Field không gửi là `undefined`; `description`/`categoryId`: null` gửi tường minh là
    // "xoá mô tả"/"bỏ danh mục". KHÔNG dùng `Object.hasOwn` — xem UpdateTaskDto.
    let updated = task;
    // `@IsOptional()` cho cả `title: null` đi qua — coi như không gửi title.
    if (typeof dto.title === 'string') {
      updated = await this.taskRepository.updateDetails(taskId, {
        title: dto.title,
        description: dto.description === undefined ? task.description : dto.description,
        categoryId: dto.categoryId === undefined ? task.categoryId : dto.categoryId,
        dueDate:
          dto.dueDate === undefined
            ? task.dueDate
            : dto.dueDate === null
              ? null
              : new Date(dto.dueDate),
        priority: dto.priority ?? task.priority,
      });
    }
    if (dto.status !== undefined) {
      updated = await this.taskRepository.updateStatus(taskId, dto.status);
    }

    return this.toResult(updated);
  }

  async remove(userId: string, taskId: string): Promise<void> {
    await this.findOwnedTaskOrThrow(userId, taskId);
    await this.taskRepository.delete(taskId);
  }

  /**
   * afterTaskId/beforeTaskId tham chiếu qua body (không phải path như taskId đang kéo) — coi
   * không tồn tại/không thuộc user này là lỗi INPUT (400 VALIDATION_ERROR), không phải 403/404
   * như thao tác trực tiếp lên 1 resource qua URL — xem docs/Task_Reorder_ToDo.md mục 4.2 (cùng
   * quyết định đã áp dụng cho categoryId ở docs/Task_Category_ToDo.md mục 4.5).
   */
  private async findReferencedSortKeyOrThrow(userId: string, taskId: string): Promise<number> {
    const task = await this.taskRepository.findById(taskId);
    if (task === null || task.userId !== userId) {
      throw new BadRequestException('Task tham chiếu (afterTaskId/beforeTaskId) không hợp lệ.');
    }
    return task.sortKey;
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
      priority: task.priority,
      categoryId: task.categoryId,
      dueDate: task.dueDate === null ? null : task.dueDate.toISOString().slice(0, 10),
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }
}
