import { CsrfAwareHttpClient } from '../http/csrf-aware-http-client';
import type { PaginationMeta } from '../http/api-envelope.types';
import type { HttpClient } from '../http/http-client.interface';

export type TaskStatus = 'open' | 'done';

/**
 * Số liệu tổng hợp task của 1 user — KHÔNG có nội dung task (SRS A-3).
 * `lastCreatedAt` là chuỗi ISO 8601 hoặc null nếu user chưa có task.
 */
export interface UserTaskStats extends TaskStatusSummary {
  userId: string;
  lastCreatedAt: string | null;
}

export interface TaskStatusSummary {
  total: number;
  byStatus: Record<TaskStatus, number>;
}

export interface TaskStatsOverviewUser extends TaskStatusSummary {
  userId: string;
  email: string;
}

export interface TaskStatsOverviewInput {
  page: number;
  limit: number;
  email?: string;
}

export interface TaskStatsOverviewResult {
  /** Tổng toàn hệ thống — không phụ thuộc bộ lọc email/phân trang. */
  summary: TaskStatusSummary;
  items: TaskStatsOverviewUser[];
  meta: PaginationMeta;
}

/** Lớp DUY NHẤT trong FE biết path thống kê task cho ADMIN (feature ToDo). */
export class AdminTaskStatsApi {
  constructor(private readonly httpClient: HttpClient = new CsrfAwareHttpClient()) {}

  async getUserTaskStats(userId: string): Promise<UserTaskStats> {
    const { data } = await this.httpClient.request<UserTaskStats>({
      method: 'GET',
      path: `/admin/users/${encodeURIComponent(userId)}/task-stats`,
    });
    return data as UserTaskStats;
  }

  async getOverview(input: TaskStatsOverviewInput): Promise<TaskStatsOverviewResult> {
    const { data, meta } = await this.httpClient.request<Omit<TaskStatsOverviewResult, 'meta'>>({
      method: 'GET',
      path: '/admin/task-stats',
      query: { page: String(input.page), limit: String(input.limit), email: input.email },
    });
    if (!data || !meta) {
      // Vi phạm bất biến hợp đồng (BE đổi contract) — không phải lỗi input.
      throw new Error('Invariant violation: GET /admin/task-stats response thiếu `data` hoặc `meta`.');
    }
    return { summary: data.summary, items: data.items, meta };
  }
}

export const adminTaskStatsApi = new AdminTaskStatsApi();
