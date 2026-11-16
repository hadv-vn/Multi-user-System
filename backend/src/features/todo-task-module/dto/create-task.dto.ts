import { IsDateString, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

import { INSERT_POSITION_VALUES } from '../insert-position.constants.js';
import { TASK_PRIORITY_VALUES } from '../task-priority.constants.js';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập tiêu đề task.' })
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  /** Không gửi -> mặc định 'top' (DEFAULT_INSERT_POSITION) — xem TaskService.create. */
  @IsOptional()
  @IsIn(INSERT_POSITION_VALUES)
  insertPosition?: string;

  /** docs/Task_Category_ToDo.md mục 4.5 — validate thuộc đúng user ở TaskService, không ở đây. */
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  /** docs/Task_DueDate_ToDo.md mục 4 — không gửi = không có hạn. Ngày dạng ISO (`YYYY-MM-DD`). */
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  /** docs/Task_Priority_ToDo.md mục 4 — không gửi = mặc định 'medium' (TASK_DEFAULT_PRIORITY). */
  @IsOptional()
  @IsIn(TASK_PRIORITY_VALUES)
  priority?: string;
}
