import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';

import type { AuthenticatedUserContext } from '../../types/authenticated-user-context.interface.js';
import { InsufficientRoleException } from '../exceptions/insufficient-role.exception.js';
import { ROLE_NAME } from '../role.constants.js';

import { RolesGuard } from './roles.guard.js';

interface RequestWithAuthContext {
  authContext?: AuthenticatedUserContext;
}

function createExecutionContext(
  request: RequestWithAuthContext,
): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => undefined,
      getNext: () => undefined,
    }),
  } as unknown as ExecutionContext;
}

function createGuard(requiredRoles: string[] | undefined): {
  guard: RolesGuard;
  reflector: Reflector;
} {
  const reflector = {
    getAllAndOverride: vi.fn().mockReturnValue(requiredRoles),
  } as unknown as Reflector;
  const guard = new RolesGuard(reflector);
  return { guard, reflector };
}

describe('RolesGuard', () => {
  it('không có metadata @Roles (undefined) → cho qua, không đọc request', () => {
    const { guard } = createGuard(undefined);

    const result = guard.canActivate(createExecutionContext({}));

    expect(result).toBe(true);
  });

  it('metadata @Roles là mảng rỗng → cho qua', () => {
    const { guard } = createGuard([]);

    const result = guard.canActivate(createExecutionContext({}));

    expect(result).toBe(true);
  });

  it('có metadata, authContext.role đủ quyền → cho qua', () => {
    const { guard } = createGuard([ROLE_NAME.ADMIN]);
    const request: RequestWithAuthContext = {
      authContext: { userId: 'user-1', role: ROLE_NAME.ADMIN, sessionId: 'session-1' },
    };

    const result = guard.canActivate(createExecutionContext(request));

    expect(result).toBe(true);
  });

  it('có metadata, authContext.role không đủ quyền → InsufficientRoleException', () => {
    const { guard } = createGuard([ROLE_NAME.ADMIN]);
    const request: RequestWithAuthContext = {
      authContext: { userId: 'user-1', role: ROLE_NAME.USER, sessionId: 'session-1' },
    };

    expect(() => guard.canActivate(createExecutionContext(request))).toThrow(
      InsufficientRoleException,
    );
  });

  it('có metadata nhưng authContext rỗng (thiếu AuthGuard trước đó) → ném lỗi cấu hình (Error thuần, KHÔNG phải InsufficientRoleException)', () => {
    const { guard } = createGuard([ROLE_NAME.ADMIN]);

    let caught: unknown;
    try {
      guard.canActivate(createExecutionContext({}));
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Error);
    expect(caught).not.toBeInstanceOf(InsufficientRoleException);
    expect((caught as Error).message).toMatch(/AuthGuard chưa chạy trước RolesGuard/);
  });
});
