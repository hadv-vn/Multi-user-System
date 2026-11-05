import type { TaskStatusSummary } from './task-status-summary.js';

/**
 * Các record thống kê cho màn hình quản trị CHỈ chứa con số, mốc thời gian
 * và email (vốn đã hiện ở danh sách user) — tuyệt đối không chứa
 * title/description của task (SRS A-3).
 */
export interface UserTaskStatisticsRecord extends TaskStatusSummary {
  userId: string;
  lastCreatedAt: Date | null;
}

export interface TaskOverviewUserRecord extends TaskStatusSummary {
  userId: string;
  email: string;
}

export interface TaskStatisticsOverviewFilter {
  page: number;
  limit: number;
  email?: string;
}

export interface TaskStatisticsOverviewRecord {
  /** Tổng hợp toàn hệ thống — không phụ thuộc bộ lọc email/phân trang. */
  summary: TaskStatusSummary;
  items: TaskOverviewUserRecord[];
  /** Số user khớp bộ lọc (để phân trang). */
  totalItems: number;
}
