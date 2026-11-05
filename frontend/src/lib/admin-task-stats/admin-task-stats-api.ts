import { CsrfAwareHttpClient } from '../http/csrf-aware-http-client';
import type { HttpClient } from '../http/http-client.interface';

export type TaskStatus = 'open' | 'done';

/**
 * Số liệu tổng hợp task của 1 user — KHÔNG có nội dung task (SRS A-3).
 * `lastCreatedAt` là chuỗi ISO 8601 hoặc null nếu user chưa có task.
 */
export interface UserTaskStats {
  userId: string;
  total: number;
  byStatus: Record<TaskStatus, number>;
  lastCreatedAt: string | null;
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
}

export const adminTaskStatsApi = new AdminTaskStatsApi();
