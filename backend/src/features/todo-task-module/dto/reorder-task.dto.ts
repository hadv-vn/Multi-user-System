import { IsOptional, IsUUID } from 'class-validator';

/**
 * Body cho `PATCH /api/v1/tasks/:id/reorder` — docs/Task_Reorder_ToDo.md mục 4.2.
 * "Đặt task này ngay sau afterTaskId và ngay trước beforeTaskId". `null`/không gửi ở 1 trong 2
 * field nghĩa là kéo vào đầu/cuối danh sách — TaskService tự tính sortKey mới, DTO này chỉ mang
 * 2 tham chiếu, không mang giá trị sortKey trực tiếp từ client (xem lý do ở tài liệu trên).
 */
export class ReorderTaskDto {
  @IsOptional()
  @IsUUID()
  afterTaskId?: string | null;

  @IsOptional()
  @IsUUID()
  beforeTaskId?: string | null;
}
