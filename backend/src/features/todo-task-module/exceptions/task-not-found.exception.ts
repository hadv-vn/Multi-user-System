import { HttpStatus } from '@nestjs/common';

import { AppException } from '../../../common/exceptions/app.exception.js';

export class TaskNotFoundException extends AppException {
  constructor() {
    super(HttpStatus.NOT_FOUND, 'TASK_NOT_FOUND', 'Task không tồn tại.');
  }
}
