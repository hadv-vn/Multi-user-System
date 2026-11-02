import { HttpStatus } from '@nestjs/common';

import { AppException } from '../../../common/exceptions/app.exception.js';

export class TaskForbiddenException extends AppException {
  constructor() {
    super(HttpStatus.FORBIDDEN, 'TASK_FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.');
  }
}
