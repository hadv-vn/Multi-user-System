export interface TaskRecord {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  sortKey: number;
  categoryId: string | null;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
