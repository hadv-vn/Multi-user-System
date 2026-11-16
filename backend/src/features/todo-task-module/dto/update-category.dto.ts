import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

import { CATEGORY_COLOR_VALUES, CATEGORY_ICON_VALUES } from '../category-appearance.constants.js';

/**
 * Cả 3 field đều optional (không có khái niệm "xóa" cho name/color/icon — luôn phải có giá trị,
 * khác `description` của Task) — chỉ field nào gửi mới được cập nhật.
 */
export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Tên danh mục không được để trống.' })
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsIn(CATEGORY_COLOR_VALUES)
  color?: string;

  @IsOptional()
  @IsIn(CATEGORY_ICON_VALUES)
  icon?: string;
}
