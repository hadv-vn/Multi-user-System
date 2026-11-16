import { TaskRecord } from './task-record.interface.js';

export interface CreateTaskData {
  title: string;
  description?: string | null;
  sortKey: number;
  categoryId?: string | null;
  dueDate?: Date | null;
  priority?: string;
}

export interface UpdateTaskDetailsData {
  title: string;
  description: string | null;
  categoryId: string | null;
  dueDate: Date | null;
  priority: string;
}

/** `null` khi user chưa có task nào — xem TaskService.create (docs/Task_Reorder_ToDo.md mục 4.3). */
export interface SortKeyRange {
  min: number;
  max: number;
}

export interface TaskRepository {
  findById(id: string): Promise<TaskRecord | null>;
  findManyByUser(userId: string, status?: string): Promise<TaskRecord[]>;
  create(userId: string, data: CreateTaskData): Promise<TaskRecord>;
  updateDetails(id: string, data: UpdateTaskDetailsData): Promise<TaskRecord>;
  updateStatus(id: string, status: string): Promise<TaskRecord>;
  updateSortKey(id: string, sortKey: number): Promise<TaskRecord>;
  findSortKeyRange(userId: string): Promise<SortKeyRange | null>;
  delete(id: string): Promise<void>;
}

export const TASK_REPOSITORY = Symbol('TaskRepository');
