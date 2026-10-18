import { HttpStatus } from '@nestjs/common';

import { AppException } from '../../common/exceptions/app.exception.js';

export class TokenInvalidException extends AppException {
  constructor() {
    super(HttpStatus.BAD_REQUEST, 'TOKEN_INVALID', 'Liên kết không hợp lệ.');
  }
}
