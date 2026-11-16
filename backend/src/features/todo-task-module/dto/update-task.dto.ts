import { IsDateString, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

import { TASK_PRIORITY_VALUES } from '../task-priority.constants.js';
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
 * TaskService phân biệt field "có gửi" hay "không gửi" bằng `!== undefined`,
 * KHÔNG dùng `Object.hasOwn`: backend build với `target: ES2023` nên mọi
 * field khai báo ở class này luôn là own property (giá trị `undefined`) trên
 * instance do ValidationPipe/class-transformer tạo, kể cả khi body không gửi
 * field đó. Giá trị `null` chỉ xuất hiện khi client gửi tường minh.
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

  /** `null` tường minh = bỏ danh mục; không gửi = giữ nguyên — cùng quy ước `description`. */
  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  /** `null` tường minh = xóa hạn; không gửi = giữ nguyên — cùng quy ước `description`/`categoryId`. */
  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  /** Không có khái niệm "xóa" — luôn phải có giá trị hợp lệ khi gửi, khác `description`/`dueDate`. */
  @IsOptional()
  @IsIn(TASK_PRIORITY_VALUES)
  priority?: string;
}
