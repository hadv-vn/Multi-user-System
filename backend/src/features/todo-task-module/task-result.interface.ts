/**
 * KHÔNG có `userId` — không expose ownership, enforce nội bộ ở TaskService
 * qua `AuthenticatedUserContext.userId` (cùng nguyên tắc contract cũ).
 */
export interface TaskResult {
  id: string;
  title: string;
  description: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}
