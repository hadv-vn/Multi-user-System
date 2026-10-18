import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { AuthenticatedUserContext } from '../types/authenticated-user-context.interface.js';

import { RequestWithAuthContext } from './guards/auth.guard.js';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUserContext => {
    const request = context.switchToHttp().getRequest<RequestWithAuthContext>();
    // AuthGuard luôn chạy trước và gắn authContext — nếu thiếu là lỗi cấu
    // hình route (quên @UseGuards(AuthGuard)), không phải input người dùng.
    if (!request.authContext) {
      throw new Error('AuthGuard chưa chạy trước @CurrentUser() — kiểm tra lại route guard.');
    }
    return request.authContext;
  },
);
