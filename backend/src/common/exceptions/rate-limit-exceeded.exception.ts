import { HttpStatus } from '@nestjs/common';

import { AppException } from './app.exception.js';

/**
 * Dùng chung cho mọi endpoint bị rate-limit theo IP (C-6, C-13): register,
 * login, verify-email, resend-verification, forgot-password, reset-password.
 */
export class RateLimitExceededException extends AppException {
  constructor(errorCode: string, message: string, retryAfterSeconds: number) {
    super(HttpStatus.TOO_MANY_REQUESTS, errorCode, message, { retryAfterSeconds });
  }
}
