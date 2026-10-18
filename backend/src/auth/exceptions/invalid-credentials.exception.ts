import { HttpStatus } from '@nestjs/common';

import { AppException } from '../../common/exceptions/app.exception.js';

/**
 * Dùng CHUNG cho cả 2 nhánh "email không tồn tại" và "sai mật khẩu"
 * (api-spec 2.4, nguyên tắc 1.7) — KHÔNG được tạo 2 exception riêng biệt,
 * để tránh lộ thông tin tài khoản có tồn tại hay không.
 */
export class InvalidCredentialsException extends AppException {
  constructor() {
    super(HttpStatus.UNAUTHORIZED, 'AUTH_INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng.');
  }
}
