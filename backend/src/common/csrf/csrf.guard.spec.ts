/* eslint-disable @typescript-eslint/unbound-method --
 * Rule báo sai trên idiom chuẩn của Vitest mocking: tham chiếu trực tiếp 1
 * method của object mock (vd `expect(mocks.x.method).toHaveBeenCalledWith(...)`,
 * `vi.mocked(mocks.x.method)`) để assert — các method này là `vi.fn()`
 * không dùng `this`, không có rủi ro mất ngữ cảnh `this` thật như rule giả định. */
import type { ExecutionContext } from '@nestjs/common';

import type { AuthenticatedUserContext } from '../../types/authenticated-user-context.interface.js';

import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from './csrf.constants.js';
import type { CsrfTokenService } from './csrf-token.service.js';
import { CsrfGuard } from './csrf.guard.js';
import { CsrfTokenInvalidException } from './exceptions/csrf-token-invalid.exception.js';

interface RequestShape {
  authContext?: AuthenticatedUserContext;
  cookies?: Record<string, string>;
  headers: Record<string, string | undefined>;
}

function createExecutionContext(request: RequestShape): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => undefined,
      getNext: () => undefined,
    }),
  } as unknown as ExecutionContext;
}

function createGuard(): { guard: CsrfGuard; csrfTokenService: CsrfTokenService } {
  const csrfTokenService = {
    deriveToken: vi.fn(),
    verify: vi.fn(),
  } as unknown as CsrfTokenService;
  const guard = new CsrfGuard(csrfTokenService);
  return { guard, csrfTokenService };
}

const AUTH_CONTEXT: AuthenticatedUserContext = {
  userId: 'user-1',
  role: 'USER',
  sessionId: 'session-1',
};

describe('CsrfGuard', () => {
  it('authContext rỗng (thiếu AuthGuard trước đó) → ném lỗi cấu hình (Error thuần)', () => {
    const { guard } = createGuard();
    const request: RequestShape = { headers: {} };

    expect(() => guard.canActivate(createExecutionContext(request))).toThrow(
      /AuthGuard chưa chạy trước CsrfGuard/,
    );
  });

  it('thiếu cookie CSRF → CsrfTokenInvalidException', () => {
    const { guard } = createGuard();
    const request: RequestShape = {
      authContext: AUTH_CONTEXT,
      cookies: {},
      headers: { [CSRF_HEADER_NAME]: 'token-value' },
    };

    expect(() => guard.canActivate(createExecutionContext(request))).toThrow(
      CsrfTokenInvalidException,
    );
  });

  it('thiếu header CSRF → CsrfTokenInvalidException', () => {
    const { guard } = createGuard();
    const request: RequestShape = {
      authContext: AUTH_CONTEXT,
      cookies: { [CSRF_COOKIE_NAME]: 'token-value' },
      headers: {},
    };

    expect(() => guard.canActivate(createExecutionContext(request))).toThrow(
      CsrfTokenInvalidException,
    );
  });

  it('cookie khác header → CsrfTokenInvalidException', () => {
    const { guard } = createGuard();
    const request: RequestShape = {
      authContext: AUTH_CONTEXT,
      cookies: { [CSRF_COOKIE_NAME]: 'token-a' },
      headers: { [CSRF_HEADER_NAME]: 'token-b' },
    };

    expect(() => guard.canActivate(createExecutionContext(request))).toThrow(
      CsrfTokenInvalidException,
    );
  });

  it('cookie == header nhưng csrfTokenService.verify trả false → CsrfTokenInvalidException', () => {
    const { guard, csrfTokenService } = createGuard();
    vi.mocked(csrfTokenService.verify).mockReturnValue(false);
    const request: RequestShape = {
      authContext: AUTH_CONTEXT,
      cookies: { [CSRF_COOKIE_NAME]: 'matching-token' },
      headers: { [CSRF_HEADER_NAME]: 'matching-token' },
    };

    expect(() => guard.canActivate(createExecutionContext(request))).toThrow(
      CsrfTokenInvalidException,
    );
  });

  it('cookie == header và csrfTokenService.verify trả true → trả true, verify được gọi đúng sessionId', () => {
    const { guard, csrfTokenService } = createGuard();
    vi.mocked(csrfTokenService.verify).mockReturnValue(true);
    const request: RequestShape = {
      authContext: AUTH_CONTEXT,
      cookies: { [CSRF_COOKIE_NAME]: 'matching-token' },
      headers: { [CSRF_HEADER_NAME]: 'matching-token' },
    };

    const result = guard.canActivate(createExecutionContext(request));

    expect(result).toBe(true);
    expect(csrfTokenService.verify).toHaveBeenCalledWith('session-1', 'matching-token');
  });
});
