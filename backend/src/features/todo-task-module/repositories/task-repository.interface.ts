import { TaskRecord } from './task-record.interface.js';

export interface CreateTaskData {
  title: string;
  description?: string | null;
}

export interface UpdateTaskDetailsData {
  title: string;
  description: string | null;
}

export interface TaskRepository {
  findById(id: string): Promise<TaskRecord | null>;
  findManyByUser(userId: string, status?: string): Promise<TaskRecord[]>;
  create(userId: string, data: CreateTaskData): Promise<TaskRecord>;
  updateDetails(id: string, data: UpdateTaskDetailsData): Promise<TaskRecord>;
  updateStatus(id: string, status: string): Promise<TaskRecord>;
  delete(id: string): Promise<void>;
}

export const TASK_REPOSITORY = Symbol('TaskRepository');
