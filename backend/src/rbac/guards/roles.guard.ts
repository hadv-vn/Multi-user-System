import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

import { AuthenticatedUserContext } from '../../types/authenticated-user-context.interface.js';
import { InsufficientRoleException } from '../exceptions/insufficient-role.exception.js';
import { RoleName } from '../role.constants.js';
import { ROLES_METADATA_KEY } from '../roles.decorator.js';

interface RequestWithAuthContext extends Request {
  authContext?: AuthenticatedUserContext;
}

/**
 * Đọc role yêu cầu từ metadata @Roles(), so khớp với authContext.role (đã
 * gắn bởi AuthGuard) — KHÔNG tự tra DB. PHẢI chạy SAU AuthGuard.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleName[] | undefined>(
      ROLES_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithAuthContext>();
    if (!request.authContext) {
      // Lỗi cấu hình route (thiếu AuthGuard trước RolesGuard), không phải
      // input người dùng — cùng quy ước với current-user.decorator.ts.
      throw new Error(
        'AuthGuard chưa chạy trước RolesGuard — kiểm tra lại thứ tự guard của route.',
      );
    }

    if (!requiredRoles.includes(request.authContext.role as RoleName)) {
      throw new InsufficientRoleException();
    }

    return true;
  }
}
