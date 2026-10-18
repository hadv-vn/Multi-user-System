import { HttpStatus } from '@nestjs/common';

import { AppException } from '../../common/exceptions/app.exception.js';

export class TokenExpiredException extends AppException {
  constructor() {
    super(HttpStatus.GONE, 'TOKEN_EXPIRED', 'Liên kết đã hết hạn. Vui lòng yêu cầu gửi lại.');
  }
}
