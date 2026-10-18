import { HttpStatus } from '@nestjs/common';

import { AppException } from '../../common/exceptions/app.exception.js';

export class DuplicateEmailException extends AppException {
  constructor() {
    super(
      HttpStatus.CONFLICT,
      'EMAIL_ALREADY_REGISTERED',
      'Email này đã được đăng ký. Vui lòng đăng nhập hoặc dùng email khác.',
    );
  }
}
