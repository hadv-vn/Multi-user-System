import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

import { AuthenticatedUserContext } from '../../types/authenticated-user-context.interface.js';
import { UnauthenticatedException } from '../exceptions/unauthenticated.exception.js';
import { SessionService } from '../session.service.js';

export interface RequestWithAuthContext extends Request {
  authContext?: AuthenticatedUserContext;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly sessionService: SessionService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithAuthContext>();
    const cookieName = this.configService.get<string>('SESSION_COOKIE_NAME') ?? 'sid';
    const sessionId: unknown = request.cookies?.[cookieName];

    if (typeof sessionId !== 'string' || sessionId.length === 0) {
      throw new UnauthenticatedException();
    }

    request.authContext = await this.sessionService.getActiveSessionContext(sessionId);
    return true;
  }
}
