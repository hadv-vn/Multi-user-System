import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

import { CATEGORY_COLOR_VALUES, CATEGORY_ICON_VALUES } from '../category-appearance.constants.js';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập tên danh mục.' })
  @MaxLength(50)
  name!: string;

  @IsOptional()
  @IsIn(CATEGORY_COLOR_VALUES)
  color?: string;

  @IsOptional()
  @IsIn(CATEGORY_ICON_VALUES)
  icon?: string;
}
