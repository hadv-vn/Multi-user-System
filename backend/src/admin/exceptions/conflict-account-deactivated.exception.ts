import { HttpStatus } from '@nestjs/common';

import { AppException } from '../../common/exceptions/app.exception.js';

export class ConflictAccountDeactivatedException extends AppException {
  constructor() {
    super(
      HttpStatus.CONFLICT,
      'CONFLICT_ACCOUNT_DEACTIVATED',
      'Tài khoản mục tiêu đã bị vô hiệu hóa.',
    );
  }
}
