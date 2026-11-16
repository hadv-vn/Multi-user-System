/**
 * KHÔNG có `userId` — không expose ownership, enforce nội bộ ở TaskService
 * qua `AuthenticatedUserContext.userId` (cùng nguyên tắc contract cũ).
 */
export interface TaskResult {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  categoryId: string | null;
  /** `YYYY-MM-DD`, không có phần giờ — xem TaskService.toResult (docs/Task_DueDate_ToDo.md mục 3.3). */
  dueDate: string | null;
  createdAt: Date;
  updatedAt: Date;
}
