import { HttpException } from '@nestjs/common';

import { ErrorDetailItem } from './error-detail-item.interface.js';

/**
 * Lớp cha cho mọi lỗi nghiệp vụ có mã lỗi ổn định (errorCode), map 1-1
 * với response envelope lỗi đã chốt ở api-spec mục 1.4.
 */
export abstract class AppException extends HttpException {
  readonly errorCode: string;
  readonly details?: ErrorDetailItem[];
  readonly retryAfterSeconds?: number;

  protected constructor(
    httpStatus: number,
    errorCode: string,
    message: string,
    options?: { details?: ErrorDetailItem[]; retryAfterSeconds?: number },
  ) {
    super(message, httpStatus);
    this.errorCode = errorCode;
    this.details = options?.details;
    this.retryAfterSeconds = options?.retryAfterSeconds;
  }
}
