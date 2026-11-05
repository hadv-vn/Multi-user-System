import { HttpStatus } from '@nestjs/common';

import { AppException } from '../../../common/exceptions/app.exception.js';

/** Cùng errorCode `USER_NOT_FOUND` với AdminModule để FE xử lý thống nhất. */
export class TaskStatisticsUserNotFoundException extends AppException {
  constructor() {
    super(HttpStatus.NOT_FOUND, 'USER_NOT_FOUND', 'Không tìm thấy tài khoản.');
  }
}
