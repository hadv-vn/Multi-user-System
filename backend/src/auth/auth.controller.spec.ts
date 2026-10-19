/* eslint-disable @typescript-eslint/unbound-method --
 * Rule báo sai trên idiom chuẩn của Vitest mocking: tham chiếu trực tiếp 1
 * method của object mock (vd `expect(mocks.x.method).toHaveBeenCalledWith(...)`,
 * `vi.mocked(mocks.x.method)`) để assert — các method này là `vi.fn()`
 * không dùng `this`, không có rủi ro mất ngữ cảnh `this` thật như rule giả định. */
import type { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';

import { IS_PRODUCTION } from '../common/config/is-production.js';
import type { AuthenticatedUserContext } from '../types/authenticated-user-context.interface.js';

import type {
  LoginResult,
  RegisteredUserResult,
  VerifyEmailResult,
} from './auth-results.interface.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

function createAuthServiceStub(): AuthService {
  return {
    register: vi.fn(),
    verifyEmail: vi.fn(),
    resendVerification: vi.fn(),
    login: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    logout: vi.fn(),
  } as unknown as AuthService;
}

function createConfigServiceStub(values: Record<string, string> = {}): ConfigService {
  return {
    get: vi.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

function createRequestStub(ip?: string): Request {
  return (ip === undefined ? {} : { ip }) as unknown as Request;
}

function createResponseStub(): Response {
  return {
    cookie: vi.fn(),
    clearCookie: vi.fn(),
  } as unknown as Response;
}

describe('AuthController', () => {
  describe('register', () => {
    it('gọi authService.register với clientIp lấy từ req.ip và trả đúng envelope', async () => {
      const authService = createAuthServiceStub();
      const controller = new AuthController(authService, createConfigServiceStub());
      const registeredUser: RegisteredUserResult = {
        id: 'user-id-1',
        email: 'user@example.com',
        role: 'USER',
        status: 'PENDING_VERIFICATION',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      };
      vi.mocked(authService.register).mockResolvedValue(registeredUser);

      const response = await controller.register(
        { email: 'user@example.com', password: 'Str0ngPass1' },
        createRequestStub('198.51.100.7'),
      );

      expect(authService.register).toHaveBeenCalledWith(
        { email: 'user@example.com', password: 'Str0ngPass1' },
        '198.51.100.7',
      );
      expect(response.data).toEqual(registeredUser);
      expect(response.message).toMatch(/kiểm tra email/);
    });

    it('dùng "unknown" khi req.ip không xác định được', async () => {
      const authService = createAuthServiceStub();
      const controller = new AuthController(authService, createConfigServiceStub());
      vi.mocked(authService.register).mockResolvedValue({
        id: 'user-id-1',
        email: 'user@example.com',
        role: 'USER',
        status: 'PENDING_VERIFICATION',
        createdAt: new Date(),
      });

      await controller.register(
        { email: 'user@example.com', password: 'Str0ngPass1' },
        createRequestStub(undefined),
      );

      expect(authService.register).toHaveBeenCalledWith(expect.anything(), 'unknown');
    });
  });

  describe('verifyEmail', () => {
    it('gọi authService.verifyEmail với token từ query và clientIp', async () => {
      const authService = createAuthServiceStub();
      const controller = new AuthController(authService, createConfigServiceStub());
      const verifyResult: VerifyEmailResult = { status: 'VERIFIED', email: 'user@example.com' };
      vi.mocked(authService.verifyEmail).mockResolvedValue(verifyResult);

      const response = await controller.verifyEmail(
        { token: 'the-token' },
        createRequestStub('198.51.100.7'),
      );

      expect(authService.verifyEmail).toHaveBeenCalledWith('the-token', '198.51.100.7');
      expect(response.data).toEqual(verifyResult);
    });
  });

  describe('resendVerification', () => {
    it('gọi authService.resendVerification và trả message cố định (không lộ tồn tại email)', async () => {
      const authService = createAuthServiceStub();
      const controller = new AuthController(authService, createConfigServiceStub());
      vi.mocked(authService.resendVerification).mockResolvedValue(undefined);

      const response = await controller.resendVerification(
        { email: 'user@example.com' },
        createRequestStub('198.51.100.7'),
      );

      expect(authService.resendVerification).toHaveBeenCalledWith(
        { email: 'user@example.com' },
        '198.51.100.7',
      );
      expect(response.message).toBe(
        'Nếu email tồn tại và chưa được xác thực, một email xác thực mới đã được gửi.',
      );
    });
  });

  describe('login', () => {
    it('gọi authService.login, set cookie session đúng tên/giá trị/thuộc tính và trả LoginResult', async () => {
      const authService = createAuthServiceStub();
      const controller = new AuthController(authService, createConfigServiceStub());
      const loginResult: LoginResult = {
        user: { id: 'user-id-1', email: 'user@example.com', role: 'USER' },
        session: { id: 'session-abc', expiresAt: new Date('2099-01-08T00:00:00.000Z') },
      };
      vi.mocked(authService.login).mockResolvedValue(loginResult);
      const response = createResponseStub();

      const result = await controller.login(
        { email: 'user@example.com', password: 'correct' },
        createRequestStub('198.51.100.7'),
        response,
      );

      expect(authService.login).toHaveBeenCalledWith(
        { email: 'user@example.com', password: 'correct' },
        '198.51.100.7',
      );
      expect(response.cookie).toHaveBeenCalledWith(
        'sid',
        'session-abc',
        expect.objectContaining({
          httpOnly: true,
          secure: IS_PRODUCTION,
          sameSite: 'lax',
          path: '/',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        }),
      );
      expect(result.data).toEqual(loginResult);
    });

    it('dùng tên cookie/sameSite tùy biến từ ConfigService khi được cấu hình', async () => {
      const authService = createAuthServiceStub();
      const controller = new AuthController(
        authService,
        createConfigServiceStub({
          SESSION_COOKIE_NAME: 'custom_sid',
          SESSION_COOKIE_SAME_SITE: 'strict',
        }),
      );
      vi.mocked(authService.login).mockResolvedValue({
        user: { id: 'user-id-1', email: 'user@example.com', role: 'USER' },
        session: { id: 'session-abc', expiresAt: new Date('2099-01-08T00:00:00.000Z') },
      });
      const response = createResponseStub();

      await controller.login(
        { email: 'user@example.com', password: 'correct' },
        createRequestStub(),
        response,
      );

      expect(response.cookie).toHaveBeenCalledWith(
        'custom_sid',
        'session-abc',
        expect.objectContaining({ sameSite: 'strict' }),
      );
    });
  });

  describe('forgotPassword', () => {
    it('gọi authService.forgotPassword và trả message cố định (không lộ tồn tại email)', async () => {
      const authService = createAuthServiceStub();
      const controller = new AuthController(authService, createConfigServiceStub());
      vi.mocked(authService.forgotPassword).mockResolvedValue(undefined);

      const response = await controller.forgotPassword(
        { email: 'user@example.com' },
        createRequestStub('198.51.100.7'),
      );

      expect(authService.forgotPassword).toHaveBeenCalledWith(
        { email: 'user@example.com' },
        '198.51.100.7',
      );
      expect(response.message).toBe(
        'Nếu email tồn tại trong hệ thống, một email đặt lại mật khẩu đã được gửi.',
      );
    });
  });

  describe('resetPassword', () => {
    it('gọi authService.resetPassword với đúng dto và clientIp', async () => {
      const authService = createAuthServiceStub();
      const controller = new AuthController(authService, createConfigServiceStub());
      vi.mocked(authService.resetPassword).mockResolvedValue(undefined);

      const response = await controller.resetPassword(
        { token: 'the-token', newPassword: 'NewStr0ngPass1' },
        createRequestStub('198.51.100.7'),
      );

      expect(authService.resetPassword).toHaveBeenCalledWith(
        { token: 'the-token', newPassword: 'NewStr0ngPass1' },
        '198.51.100.7',
      );
      expect(response.message).toMatch(/đặt lại thành công/);
    });
  });

  describe('logout', () => {
    it('gọi authService.logout với sessionId của người dùng hiện tại và xóa cookie', async () => {
      const authService = createAuthServiceStub();
      const controller = new AuthController(authService, createConfigServiceStub());
      vi.mocked(authService.logout).mockResolvedValue(undefined);
      const response = createResponseStub();
      const currentUser: AuthenticatedUserContext = {
        userId: 'user-id-1',
        role: 'USER',
        sessionId: 'session-abc',
      };

      const result = await controller.logout(currentUser, response);

      expect(authService.logout).toHaveBeenCalledWith('session-abc');
      expect(response.clearCookie).toHaveBeenCalledWith('sid', { path: '/' });
      expect(result.message).toBe('Đã đăng xuất.');
    });
  });
});
