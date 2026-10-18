import { HttpStatus } from '@nestjs/common';

import { AppException } from '../../common/exceptions/app.exception.js';
import { ErrorDetailItem } from '../../common/exceptions/error-detail-item.interface.js';

export class FieldNotEditableException extends AppException {
  constructor(details: ErrorDetailItem[]) {
    super(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'FIELD_NOT_EDITABLE',
      'Trường dữ liệu này không thể chỉnh sửa qua endpoint này.',
      { details },
    );
  }
}
