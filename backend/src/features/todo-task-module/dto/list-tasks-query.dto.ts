import { IsIn, IsOptional } from 'class-validator';

import { TASK_STATUS_VALUES } from '../task-status.constants.js';

export class ListTasksQueryDto {
  @IsOptional()
  @IsIn(TASK_STATUS_VALUES)
  status?: string;
}
