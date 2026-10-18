import { HttpStatus } from '@nestjs/common';

import { AppException } from '../../common/exceptions/app.exception.js';

export class EmailNotVerifiedException extends AppException {
  constructor() {
    super(
      HttpStatus.FORBIDDEN,
      'ACCOUNT_EMAIL_NOT_VERIFIED',
      'Vui lòng xác thực email trước khi đăng nhập.',
    );
  }
}
