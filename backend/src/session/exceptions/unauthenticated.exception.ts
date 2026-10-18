import { HttpStatus } from '@nestjs/common';

import { AppException } from '../../common/exceptions/app.exception.js';

export class UnauthenticatedException extends AppException {
  constructor() {
    super(HttpStatus.UNAUTHORIZED, 'UNAUTHENTICATED', 'Vui lòng đăng nhập để tiếp tục.');
  }
}
