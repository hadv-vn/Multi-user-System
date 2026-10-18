import { HttpStatus } from '@nestjs/common';

import { AppException } from '../../common/exceptions/app.exception.js';

export class UserNotFoundException extends AppException {
  constructor() {
    super(HttpStatus.NOT_FOUND, 'USER_NOT_FOUND', 'Không tìm thấy tài khoản.');
  }
}
