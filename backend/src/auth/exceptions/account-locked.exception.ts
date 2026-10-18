import { HttpStatus } from '@nestjs/common';

import { AppException } from '../../common/exceptions/app.exception.js';

/** Tài khoản bị ADMIN khóa thủ công (status=LOCKED, khác locked_until brute-force). */
export class AccountLockedException extends AppException {
  constructor() {
    super(
      HttpStatus.FORBIDDEN,
      'ACCOUNT_LOCKED',
      'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.',
    );
  }
}
