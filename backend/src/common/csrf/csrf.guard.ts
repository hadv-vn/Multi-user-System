import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';

import { AuthenticatedUserContext } from '../../types/authenticated-user-context.interface.js';

import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from './csrf.constants.js';
import { CsrfTokenService } from './csrf-token.service.js';
import { CsrfTokenInvalidException } from './exceptions/csrf-token-invalid.exception.js';

interface RequestWithAuthContext extends Request {
  authContext?: AuthenticatedUserContext;
}

/** Chặn request state-changing thiếu/sai CSRF token. PHẢI chạy SAU AuthGuard. */
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly csrfTokenService: CsrfTokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithAuthContext>();

    if (!request.authContext) {
      // Lỗi cấu hình route (thiếu AuthGuard trước CsrfGuard), không phải
      // input người dùng — cùng quy ước với current-user.decorator.ts.
      throw new Error('AuthGuard chưa chạy trước CsrfGuard — kiểm tra lại thứ tự guard của route.');
    }

    const cookieToken: unknown = request.cookies?.[CSRF_COOKIE_NAME];
    const headerToken = request.headers[CSRF_HEADER_NAME];

    if (
      typeof cookieToken !== 'string' ||
      cookieToken.length === 0 ||
      typeof headerToken !== 'string' ||
      headerToken.length === 0 ||
      cookieToken !== headerToken
    ) {
      throw new CsrfTokenInvalidException();
    }

    if (!this.csrfTokenService.verify(request.authContext.sessionId, cookieToken)) {
      throw new CsrfTokenInvalidException();
    }

    return true;
  }
}
