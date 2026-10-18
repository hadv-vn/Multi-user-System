import { HttpStatus } from '@nestjs/common';

import { AppException } from '../../common/exceptions/app.exception.js';

/**
 * Định nghĩa riêng (duplicate có chủ đích với AuthModule) để giữ ranh giới
 * module sạch — xem lld-phase2-rbac-account-admin.md, mục AccountModule.
 */
export class PasswordSameAsOldException extends AppException {
  constructor() {
    super(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'PASSWORD_SAME_AS_OLD',
      'Mật khẩu mới phải khác mật khẩu hiện tại.',
    );
  }
}
