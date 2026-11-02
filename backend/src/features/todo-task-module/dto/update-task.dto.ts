import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

import { TASK_STATUS_VALUES } from '../task-status.constants.js';

/**
 * DTO dùng CHUNG cho `PUT /api/v1/tasks/:id` dù client gọi với 1 trong 2 mục
 * đích khác nhau — sửa nội dung (`title`/`description`) HOẶC đổi trạng thái
 * (`status`) — không bao giờ cả 2 cùng lúc (xem Android
 * `UpdateTaskDetailsRequestDto`/`UpdateTaskStatusRequestDto`, cùng gọi 1
 * endpoint này với body khác nhau).
 *
 * `@IsOptional()` của class-validator coi `null` CŨNG là "optional" (bỏ qua
 * mọi validator khác của field đó) — nên `description: null` (xóa mô tả,
 * tường minh) đi qua được mà không cần `@ValidateIf` riêng.
 *
 * TaskService phân biệt field "có gửi" hay "không gửi" bằng
 * `Object.hasOwn(dto, 'title')`/`'status'` — class-transformer (được
 * ValidationPipe gọi ngầm) chỉ gán đúng những key THỰC SỰ có trong JSON body
 * lên instance, nên field không gửi sẽ không tồn tại như own property (khác
 * `undefined` được gán tường minh).
 */
export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsIn(TASK_STATUS_VALUES)
  status?: string;
}
