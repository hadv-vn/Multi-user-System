/* eslint-disable @typescript-eslint/unbound-method --
 * Rule báo sai trên idiom chuẩn của Vitest mocking: tham chiếu trực tiếp 1
 * method của object mock (vd `expect(mocks.x.method).toHaveBeenCalledWith(...)`,
 * `vi.mocked(mocks.x.method)`) để assert — các method này là `vi.fn()`
 * không dùng `this`, không có rủi ro mất ngữ cảnh `this` thật như rule giả định. */
import type { ExecutionContext } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';

import type { AuthenticatedUserContext } from '../../types/authenticated-user-context.interface.js';
import { UnauthenticatedException } from '../exceptions/unauthenticated.exception.js';
import { SessionService } from '../session.service.js';

import { AuthGuard, RequestWithAuthContext } from './auth.guard.js';

function createExecutionContext(request: Partial<RequestWithAuthContext>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request as RequestWithAuthContext,
      getResponse: () => undefined,
      getNext: () => undefined,
    }),
  } as unknown as ExecutionContext;
}

function createConfigServiceStub(cookieName: string | undefined): ConfigService {
  return {
    get: vi.fn().mockReturnValue(cookieName),
  } as unknown as ConfigService;
}

describe('AuthGuard', () => {
  function createGuard(cookieName?: string) {
    const sessionService = {
      getActiveSessionContext: vi.fn(),
    } as unknown as SessionService;
    const guard = new AuthGuard(sessionService, createConfigServiceStub(cookieName));
    return { guard, sessionService };
  }

  it('không có cookie "sid" → UnauthenticatedException, không gọi SessionService', async () => {
    const { guard, sessionService } = createGuard();
    const request: Partial<RequestWithAuthContext> = { cookies: {} };

    await expect(guard.canActivate(createExecutionContext(request))).rejects.toBeInstanceOf(
      UnauthenticatedException,
    );
    expect(sessionService.getActiveSessionContext).not.toHaveBeenCalled();
  });

  it('cookies undefined hoàn toàn → UnauthenticatedException', async () => {
    const { guard, sessionService } = createGuard();
    const request: Partial<RequestWithAuthContext> = {};

    await expect(guard.canActivate(createExecutionContext(request))).rejects.toBeInstanceOf(
      UnauthenticatedException,
    );
    expect(sessionService.getActiveSessionContext).not.toHaveBeenCalled();
  });

  it('cookie "sid" rỗng → UnauthenticatedException', async () => {
    const { guard, sessionService } = createGuard();
    const request: Partial<RequestWithAuthContext> = { cookies: { sid: '' } };

    await expect(guard.canActivate(createExecutionContext(request))).rejects.toBeInstanceOf(
      UnauthenticatedException,
    );
    expect(sessionService.getActiveSessionContext).not.toHaveBeenCalled();
  });

  it('session không tồn tại/đã revoke/hết hạn (SessionService ném lỗi) → lan truyền UnauthenticatedException', async () => {
    const { guard, sessionService } = createGuard();
    vi.mocked(sessionService.getActiveSessionContext).mockRejectedValue(
      new UnauthenticatedException(),
    );
    const request: Partial<RequestWithAuthContext> = { cookies: { sid: 'session-123' } };

    await expect(guard.canActivate(createExecutionContext(request))).rejects.toBeInstanceOf(
      UnauthenticatedException,
    );
  });

  it('session hợp lệ → trả true và gắn đúng AuthenticatedUserContext vào request', async () => {
    const { guard, sessionService } = createGuard();
    const context: AuthenticatedUserContext = {
      userId: 'user-id-1',
      role: 'USER',
      sessionId: 'session-123',
    };
    vi.mocked(sessionService.getActiveSessionContext).mockResolvedValue(context);
    const request: RequestWithAuthContext = {
      cookies: { sid: 'session-123' },
    } as unknown as RequestWithAuthContext;

    const canActivate = await guard.canActivate(createExecutionContext(request));

    expect(canActivate).toBe(true);
    expect(sessionService.getActiveSessionContext).toHaveBeenCalledWith('session-123');
    expect(request.authContext).toEqual(context);
  });

  it('đọc tên cookie session từ ConfigService(SESSION_COOKIE_NAME) khi được cấu hình khác "sid"', async () => {
    const { guard, sessionService } = createGuard('custom_session');
    const context: AuthenticatedUserContext = {
      userId: 'user-id-1',
      role: 'USER',
      sessionId: 'session-456',
    };
    vi.mocked(sessionService.getActiveSessionContext).mockResolvedValue(context);
    const request: Partial<RequestWithAuthContext> = {
      cookies: { custom_session: 'session-456', sid: 'should-be-ignored' },
    };

    await guard.canActivate(createExecutionContext(request));

    expect(sessionService.getActiveSessionContext).toHaveBeenCalledWith('session-456');
  });
});
