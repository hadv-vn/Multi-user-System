import { HttpStatus } from '@nestjs/common';

import { AppException } from '../../common/exceptions/app.exception.js';

export class CurrentPasswordIncorrectException extends AppException {
  constructor() {
    super(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'CURRENT_PASSWORD_INCORRECT',
      'Mật khẩu hiện tại không đúng.',
    );
  }
}
