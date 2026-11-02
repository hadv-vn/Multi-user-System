export interface TaskRecord {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}
