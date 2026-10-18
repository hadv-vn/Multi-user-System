import { HttpStatus } from '@nestjs/common';

import { AppException } from '../../common/exceptions/app.exception.js';

/** C-3/C-10: chặn mọi hành động khiến hệ thống không còn ADMIN ACTIVE nào. */
export class LastAdminRuleViolationException extends AppException {
  constructor() {
    super(
      HttpStatus.CONFLICT,
      'LAST_ADMIN_RULE_VIOLATION',
      'Hành động này sẽ khiến hệ thống không còn quản trị viên (ADMIN) nào đang hoạt động.',
    );
  }
}
