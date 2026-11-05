import type { TaskStatus } from '../task-status.constants.js';

/**
 * Số liệu tổng hợp task của 1 user cho màn hình quản trị. CHỈ chứa con số
 * và mốc thời gian — tuyệt đối không chứa title/description (SRS A-3).
 */
export interface UserTaskStatisticsRecord {
  userId: string;
  total: number;
  byStatus: Record<TaskStatus, number>;
  lastCreatedAt: Date | null;
}
