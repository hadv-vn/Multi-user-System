import { HttpStatus } from '@nestjs/common';

import { AppException } from '../../common/exceptions/app.exception.js';

/**
 * Chỉ dùng cho reset-password (409) — KHÁC hành vi verify-email, nơi
 * token đã dùng là thành công idempotent (ALREADY_VERIFIED), không phải lỗi.
 */
export class TokenAlreadyUsedException extends AppException {
  constructor() {
    super(HttpStatus.CONFLICT, 'TOKEN_ALREADY_USED', 'Liên kết này đã được sử dụng trước đó.');
  }
}
