import { HttpStatus } from '@nestjs/common';

import { AppException } from '../../common/exceptions/app.exception.js';

export class PasswordSameAsOldException extends AppException {
  constructor() {
    super(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'PASSWORD_SAME_AS_OLD',
      'Mật khẩu mới phải khác mật khẩu hiện tại.',
    );
  }
}
