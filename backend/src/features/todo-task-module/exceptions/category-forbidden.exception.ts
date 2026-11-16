import { HttpStatus } from '@nestjs/common';

import { AppException } from '../../../common/exceptions/app.exception.js';

export class CategoryForbiddenException extends AppException {
  constructor() {
    super(HttpStatus.FORBIDDEN, 'CATEGORY_FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.');
  }
}
