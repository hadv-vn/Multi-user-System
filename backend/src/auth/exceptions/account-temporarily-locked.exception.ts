import { HttpStatus } from '@nestjs/common';

import { AppException } from '../../common/exceptions/app.exception.js';

/** Khóa tạm do brute-force (C-5) — lockedUntil, tự hết hạn, khác ACCOUNT_LOCKED. */
export class AccountTemporarilyLockedException extends AppException {
  constructor(retryAfterSeconds: number) {
    super(
      HttpStatus.TOO_MANY_REQUESTS,
      'ACCOUNT_TEMPORARILY_LOCKED',
      'Tài khoản tạm thời bị khóa do đăng nhập sai nhiều lần. Vui lòng thử lại sau.',
      { retryAfterSeconds },
    );
  }
}
