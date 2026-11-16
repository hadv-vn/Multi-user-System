/** KHÔNG có `userId` — không expose ownership, cùng nguyên tắc TaskResult. */
export interface CategoryResult {
  id: string;
  name: string;
  color: string;
  icon: string;
  createdAt: Date;
}
