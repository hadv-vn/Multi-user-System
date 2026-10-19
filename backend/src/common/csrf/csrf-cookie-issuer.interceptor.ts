import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';

import { AuthenticatedUserContext } from '../../types/authenticated-user-context.interface.js';
import { IS_PRODUCTION } from '../config/is-production.js';

import { CSRF_COOKIE_NAME } from './csrf.constants.js';
import { CsrfTokenService } from './csrf-token.service.js';

interface RequestWithAuthContext extends Request {
  authContext?: AuthenticatedUserContext;
}

/**
 * Đảm bảo client luôn có cookie CSRF hợp lệ trước khi cần gửi request
 * state-changing — set lại trên mọi response của route đã authenticate.
 * Idempotent (cùng session → cùng giá trị), set lại nhiều lần vô hại.
 */
@Injectable()
export class CsrfCookieIssuerInterceptor implements NestInterceptor {
  constructor(private readonly csrfTokenService: CsrfTokenService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithAuthContext>();
    const response = context.switchToHttp().getResponse<Response>();

    if (request.authContext) {
      const token = this.csrfTokenService.deriveToken(request.authContext.sessionId);
      response.cookie(CSRF_COOKIE_NAME, token, {
        httpOnly: false,
        secure: IS_PRODUCTION,
        sameSite: 'lax',
        path: '/',
      });
    }

    return next.handle();
  }
}
