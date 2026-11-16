import { HttpStatus } from '@nestjs/common';

import { AppException } from '../../../common/exceptions/app.exception.js';

export class CategoryNotFoundException extends AppException {
  constructor() {
    super(HttpStatus.NOT_FOUND, 'CATEGORY_NOT_FOUND', 'Danh mục không tồn tại.');
  }
}
