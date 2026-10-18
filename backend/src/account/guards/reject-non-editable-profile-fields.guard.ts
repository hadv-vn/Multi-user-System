import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';

import { ErrorDetailItem } from '../../common/exceptions/error-detail-item.interface.js';
import { FieldNotEditableException } from '../exceptions/field-not-editable.exception.js';

const NON_EDITABLE_FIELDS = ['email', 'role'];

/**
 * Chạy ở pha Guards — TRƯỚC pha Pipes của Nest — nên bắt được field lạ
 * (email/role) và trả đúng 422 FIELD_NOT_EDITABLE, trước khi ValidationPipe
 * toàn cục (whitelist+forbidNonWhitelisted) tự ném 400 VALIDATION_ERROR.
 */
@Injectable()
export class RejectNonEditableProfileFieldsGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const body = (request.body ?? {}) as Record<string, unknown>;

    const details: ErrorDetailItem[] = NON_EDITABLE_FIELDS.filter((field) => field in body).map(
      (field) => ({ field, issue: 'NOT_EDITABLE_VIA_THIS_ENDPOINT' }),
    );

    if (details.length > 0) {
      throw new FieldNotEditableException(details);
    }

    return true;
  }
}
