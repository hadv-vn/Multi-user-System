import { HttpStatus } from '@nestjs/common';

import { AppException } from '../../exceptions/app.exception.js';

export class CsrfTokenInvalidException extends AppException {
  constructor() {
    super(
      HttpStatus.FORBIDDEN,
      'CSRF_TOKEN_INVALID',
      'Yêu cầu không hợp lệ (thiếu hoặc sai CSRF token).',
    );
  }
}
