import { HttpStatus } from '@nestjs/common';

import { AppException } from '../../common/exceptions/app.exception.js';

export class InsufficientRoleException extends AppException {
  constructor() {
    super(HttpStatus.FORBIDDEN, 'FORBIDDEN', 'Bạn không có quyền thực hiện hành động này.');
  }
}
