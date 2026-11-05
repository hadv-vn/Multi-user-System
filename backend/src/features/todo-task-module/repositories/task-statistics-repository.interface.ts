import {
  TaskStatisticsOverviewFilter,
  TaskStatisticsOverviewRecord,
  UserTaskStatisticsRecord,
} from './task-statistics-record.interface.js';

/**
 * Tách riêng khỏi TaskRepository (Interface Segregation): luồng thống kê cho
 * ADMIN chỉ cần đọc số liệu tổng hợp, không cần CRUD task.
 */
export interface TaskStatisticsRepository {
  /** Trả về null khi user không tồn tại. */
  findUserStatistics(userId: string): Promise<UserTaskStatisticsRecord | null>;
  /** User sắp theo số task giảm dần, rồi email tăng dần; gồm cả user chưa có task. */
  findOverview(filter: TaskStatisticsOverviewFilter): Promise<TaskStatisticsOverviewRecord>;
}

export const TASK_STATISTICS_REPOSITORY = Symbol('TaskStatisticsRepository');
