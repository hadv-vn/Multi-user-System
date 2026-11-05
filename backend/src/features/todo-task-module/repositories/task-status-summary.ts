import { TASK_STATUS_VALUES, type TaskStatus } from '../task-status.constants.js';

/** Tổng số task và số task theo từng trạng thái. */
export interface TaskStatusSummary {
  total: number;
  byStatus: Record<TaskStatus, number>;
}

export interface TaskStatusCount {
  status: string;
  count: number;
}

/**
 * Gom kết quả groupBy theo status thành TaskStatusSummary. Mọi trạng thái
 * trong TASK_STATUS_VALUES luôn có mặt (mặc định 0); trạng thái lạ (nếu DB
 * có) vẫn được cộng vào `total` nhưng không có khóa riêng.
 */
export function summarizeTaskStatusCounts(counts: Iterable<TaskStatusCount>): TaskStatusSummary {
  const byStatus = Object.fromEntries(TASK_STATUS_VALUES.map((status) => [status, 0])) as Record<
    TaskStatus,
    number
  >;
  let total = 0;
  for (const { status, count } of counts) {
    total += count;
    if (isKnownTaskStatus(status)) {
      byStatus[status] += count;
    }
  }
  return { total, byStatus };
}

function isKnownTaskStatus(status: string): status is TaskStatus {
  return (TASK_STATUS_VALUES as readonly string[]).includes(status);
}
