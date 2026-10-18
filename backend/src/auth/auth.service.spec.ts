/* eslint-disable @typescript-eslint/unbound-method --
 * Rule báo sai trên idiom chuẩn của Vitest mocking: tham chiếu trực tiếp 1
 * method của object mock (vd `expect(mocks.x.method).toHaveBeenCalledWith(...)`,
 * `vi.mocked(mocks.x.method)`) để assert — các method này là `vi.fn()`
 * không dùng `this`, không có rủi ro mất ngữ cảnh `this` thật như rule giả định. */
import type { ConfigService } from '@nestjs/config';

import { RateLimitExceededException } from '../common/exceptions/rate-limit-exceeded.exception.js';
import type { RateLimiter } from '../common/rate-limit/rate-limiter.interface.js';
import type { PasswordHasher } from '../common/security/password-hasher.interface.js';
import { OpaqueTokenGenerator } from '../common/security/opaque-token-generator.service.js';
import type { EmailSender } from '../email/email-sender.interface.js';
import { EmailDeliveryException } from '../email/exceptions/email-delivery.exception.js';
import { SessionService } from '../session/session.service.js';

import { AuthService } from './auth.service.js';
import { AccountLockedException } from './exceptions/account-locked.exception.js';
import { AccountTemporarilyLockedException } from './exceptions/account-temporarily-locked.exception.js';
import { DuplicateEmailException } from './exceptions/duplicate-email.exception.js';
import { EmailNotVerifiedException } from './exceptions/email-not-verified.exception.js';
import { InvalidCredentialsException } from './exceptions/invalid-credentials.exception.js';
import { PasswordSameAsOldException } from './exceptions/password-same-as-old.exception.js';
import { TokenAlreadyUsedException } from './exceptions/token-already-used.exception.js';
import { TokenExpiredException } from './exceptions/token-expired.exception.js';
import { TokenInvalidException } from './exceptions/token-invalid.exception.js';
import type { EmailVerificationTokenRepository } from './repositories/email-verification-token-repository.interface.js';
import type { PasswordResetTokenRepository } from './repositories/password-reset-token-repository.interface.js';
import type { TokenRecord } from './repositories/token-record.interface.js';
import { USER_STATUS, UserRecord } from './repositories/user-record.interface.js';
import type { UserRepository } from './repositories/user-repository.interface.js';

const CLIENT_IP = '203.0.113.10';
const APP_BASE_URL = 'https://app.example.com';
const DUMMY_PASSWORD_HASH = 'dummy-password-hash-fixed-value';

function createUserRecord(overrides: Partial<UserRecord> = {}): UserRecord {
  return {
    id: 'user-id-1',
    email: 'user@example.com',
    passwordHash: 'stored-password-hash',
    name: null,
    emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
    status: USER_STATUS.ACTIVE,
    failedLoginAttempts: 0,
    lockedUntil: null,
    disabledAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function createTokenRecord(overrides: Partial<TokenRecord> = {}): TokenRecord {
  return {
    id: 1n,
    userId: 'user-id-1',
    tokenHash: 'hashed-token-value',
    expiresAt: new Date('2099-01-01T00:00:00.000Z'),
    usedAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

interface Mocks {
  userRepository: UserRepository;
  emailVerificationTokenRepository: EmailVerificationTokenRepository;
  passwordResetTokenRepository: PasswordResetTokenRepository;
  passwordHasher: PasswordHasher;
  rateLimiter: RateLimiter;
  emailSender: EmailSender;
  sessionService: SessionService;
  configService: ConfigService;
}

function createAllowedRateLimiterMock(): RateLimiter {
  return {
    consume: vi.fn().mockResolvedValue({
      allowed: true,
      remainingAttempts: 10,
      retryAfterSeconds: 0,
    }),
  };
}

async function createAuthService(): Promise<{ service: AuthService; mocks: Mocks }> {
  const mocks: Mocks = {
    userRepository: {
      findByEmail: vi.fn().mockResolvedValue(null),
      findById: vi.fn().mockResolvedValue(null),
      createWithDefaultRole: vi.fn(),
      markEmailVerified: vi.fn().mockResolvedValue(undefined),
      updatePasswordHash: vi.fn().mockResolvedValue(undefined),
      registerFailedLoginAttempt: vi.fn().mockResolvedValue({ attempts: 1, lockedUntil: null }),
      resetFailedLoginAttempts: vi.fn().mockResolvedValue(undefined),
    },
    emailVerificationTokenRepository: {
      create: vi.fn().mockResolvedValue(undefined),
      findByTokenHash: vi.fn().mockResolvedValue(null),
      markUsed: vi.fn().mockResolvedValue(undefined),
      invalidateActiveTokensForUser: vi.fn().mockResolvedValue(undefined),
    },
    passwordResetTokenRepository: {
      create: vi.fn().mockResolvedValue(undefined),
      findByTokenHash: vi.fn().mockResolvedValue(null),
      markUsed: vi.fn().mockResolvedValue(undefined),
      invalidateActiveTokensForUser: vi.fn().mockResolvedValue(undefined),
    },
    passwordHasher: {
      hash: vi.fn().mockImplementation((plain: string) => Promise.resolve(`hashed:${plain}`)),
      verify: vi.fn().mockResolvedValue(false),
    },
    rateLimiter: createAllowedRateLimiterMock(),
    emailSender: {
      sendEmailVerification: vi.fn().mockResolvedValue(undefined),
      sendPasswordReset: vi.fn().mockResolvedValue(undefined),
    },
    sessionService: {
      createSession: vi.fn(),
      getActiveSessionContext: vi.fn(),
      revokeSession: vi.fn().mockResolvedValue(undefined),
      revokeAllSessionsForUser: vi.fn().mockResolvedValue(undefined),
    } as unknown as SessionService,
    configService: {
      getOrThrow: vi.fn().mockReturnValue(APP_BASE_URL),
      get: vi.fn(),
    } as unknown as ConfigService,
  };

  // AuthService.onModuleInit() hash dummy password cố định — mock trả giá
  // trị cố định để test có thể assert đúng tham số truyền vào verify().
  vi.mocked(mocks.passwordHasher.hash).mockImplementation((plain: string) => {
    if (plain === 'dummy-password-for-timing-safety-only') {
      return Promise.resolve(DUMMY_PASSWORD_HASH);
    }
    return Promise.resolve(`hashed:${plain}`);
  });

  const service = new AuthService(
    mocks.userRepository,
    mocks.emailVerificationTokenRepository,
    mocks.passwordResetTokenRepository,
    mocks.passwordHasher,
    mocks.rateLimiter,
    new OpaqueTokenGenerator(),
    mocks.emailSender,
    mocks.sessionService,
    mocks.configService,
  );
  await service.onModuleInit();

  return { service, mocks };
}

describe('AuthService', () => {
  describe('register', () => {
    it('vượt ngưỡng rate-limit theo IP → RateLimitExceededException, không tra DB', async () => {
      const { service, mocks } = await createAuthService();
      vi.mocked(mocks.rateLimiter.consume).mockResolvedValue({
        allowed: false,
        remainingAttempts: 0,
        retryAfterSeconds: 30,
      });

      await expect(
        service.register({ email: 'new@example.com', password: 'Str0ngPass1' }, CLIENT_IP),
      ).rejects.toBeInstanceOf(RateLimitExceededException);
      expect(mocks.userRepository.findByEmail).not.toHaveBeenCalled();
    });

    it('email đã tồn tại (bất kỳ status) → DuplicateEmailException, không tạo user mới', async () => {
      const { service, mocks } = await createAuthService();
      vi.mocked(mocks.userRepository.findByEmail).mockResolvedValue(
        createUserRecord({ status: USER_STATUS.PENDING_VERIFICATION }),
      );

      await expect(
        service.register({ email: 'user@example.com', password: 'Str0ngPass1' }, CLIENT_IP),
      ).rejects.toBeInstanceOf(DuplicateEmailException);
      expect(mocks.userRepository.createWithDefaultRole).not.toHaveBeenCalled();
    });

    it('chuẩn hóa email (lowercase + trim) trước khi tra DB và tạo user', async () => {
      const { service, mocks } = await createAuthService();
      vi.mocked(mocks.userRepository.createWithDefaultRole).mockResolvedValue(
        createUserRecord({ email: 'new@example.com' }),
      );

      await service.register({ email: '  New@Example.com  ', password: 'Str0ngPass1' }, CLIENT_IP);

      expect(mocks.userRepository.findByEmail).toHaveBeenCalledWith('new@example.com');
      expect(mocks.userRepository.createWithDefaultRole).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'new@example.com' }),
      );
    });

    it('đăng ký thành công: hash password, tạo user, phát hành token xác thực, gửi email', async () => {
      const { service, mocks } = await createAuthService();
      const createdUser = createUserRecord({
        id: 'new-user-id',
        email: 'new@example.com',
        status: USER_STATUS.PENDING_VERIFICATION,
      });
      vi.mocked(mocks.userRepository.createWithDefaultRole).mockResolvedValue(createdUser);

      const result = await service.register(
        { email: 'new@example.com', password: 'Str0ngPass1' },
        CLIENT_IP,
      );

      expect(mocks.passwordHasher.hash).toHaveBeenCalledWith('Str0ngPass1');
      expect(mocks.userRepository.createWithDefaultRole).toHaveBeenCalledWith({
        email: 'new@example.com',
        passwordHash: 'hashed:Str0ngPass1',
      });
      expect(
        mocks.emailVerificationTokenRepository.invalidateActiveTokensForUser,
      ).toHaveBeenCalledWith('new-user-id');
      expect(mocks.emailVerificationTokenRepository.create).toHaveBeenCalledWith(
        'new-user-id',
        expect.any(String),
        expect.any(Date),
      );
      expect(mocks.emailSender.sendEmailVerification).toHaveBeenCalledWith(
        expect.objectContaining({ toEmail: 'new@example.com' }),
      );
      expect(result).toEqual({
        id: 'new-user-id',
        email: 'new@example.com',
        role: 'USER',
        status: USER_STATUS.PENDING_VERIFICATION,
        createdAt: createdUser.createdAt,
      });
    });

    it('SMTP lỗi tạm thời (EmailDeliveryException) KHÔNG làm fail luồng đăng ký chính', async () => {
      const { service, mocks } = await createAuthService();
      vi.mocked(mocks.userRepository.createWithDefaultRole).mockResolvedValue(
        createUserRecord({ id: 'new-user-id', email: 'new@example.com' }),
      );
      vi.mocked(mocks.emailSender.sendEmailVerification).mockRejectedValue(
        new EmailDeliveryException(new Error('smtp down')),
      );

      await expect(
        service.register({ email: 'new@example.com', password: 'Str0ngPass1' }, CLIENT_IP),
      ).resolves.toMatchObject({ id: 'new-user-id' });
    });

    it('lỗi KHÔNG phải EmailDeliveryException khi gửi mail vẫn lan truyền (không bị nuốt sai loại lỗi)', async () => {
      const { service, mocks } = await createAuthService();
      vi.mocked(mocks.userRepository.createWithDefaultRole).mockResolvedValue(
        createUserRecord({ id: 'new-user-id', email: 'new@example.com' }),
      );
      const unexpectedError = new Error('unexpected bug');
      vi.mocked(mocks.emailSender.sendEmailVerification).mockRejectedValue(unexpectedError);

      await expect(
        service.register({ email: 'new@example.com', password: 'Str0ngPass1' }, CLIENT_IP),
      ).rejects.toBe(unexpectedError);
    });
  });

  describe('login — thứ tự kiểm tra 1.7.1', () => {
    it('vượt ngưỡng rate-limit theo IP (T6) → RateLimitExceededException, KHÔNG tra email', async () => {
      const { service, mocks } = await createAuthService();
      vi.mocked(mocks.rateLimiter.consume).mockResolvedValue({
        allowed: false,
        remainingAttempts: 0,
        retryAfterSeconds: 60,
      });

      await expect(
        service.login({ email: 'user@example.com', password: 'whatever' }, CLIENT_IP),
      ).rejects.toBeInstanceOf(RateLimitExceededException);
      expect(mocks.userRepository.findByEmail).not.toHaveBeenCalled();
    });

    it('rate-limit được kiểm tra TRƯỚC khi tra email trong DB (thứ tự bắt buộc)', async () => {
      const { service, mocks } = await createAuthService();
      vi.mocked(mocks.userRepository.findByEmail).mockResolvedValue(
        createUserRecord({ status: USER_STATUS.ACTIVE }),
      );
      vi.mocked(mocks.passwordHasher.verify).mockResolvedValue(true);
      vi.mocked(mocks.sessionService.createSession).mockResolvedValue({
        id: 'session-1',
        userId: 'user-id-1',
        roleSnapshot: 'USER',
        createdAt: new Date(),
        expiresAt: new Date('2099-01-01T00:00:00.000Z'),
        revokedAt: null,
      });

      await service.login({ email: 'user@example.com', password: 'correct' }, CLIENT_IP);

      const rateLimitOrder = vi.mocked(mocks.rateLimiter.consume).mock.invocationCallOrder[0];
      const findByEmailOrder = vi.mocked(mocks.userRepository.findByEmail).mock
        .invocationCallOrder[0];
      expect(rateLimitOrder).toBeLessThan(findByEmailOrder);
    });

    it('T5 — email không tồn tại: verify() được gọi với dummy hash, KHÔNG dùng kết quả, ném InvalidCredentialsException', async () => {
      const { service, mocks } = await createAuthService();
      vi.mocked(mocks.userRepository.findByEmail).mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@example.com', password: 'anything' }, CLIENT_IP),
      ).rejects.toBeInstanceOf(InvalidCredentialsException);

      expect(mocks.passwordHasher.verify).toHaveBeenCalledWith('anything', DUMMY_PASSWORD_HASH);
      expect(mocks.userRepository.registerFailedLoginAttempt).not.toHaveBeenCalled();
    });

    it('tài khoản LOCKED → AccountLockedException, ĐƯỢC TRẢ VỀ TRƯỚC khi kiểm tra mật khẩu', async () => {
      const { service, mocks } = await createAuthService();
      vi.mocked(mocks.userRepository.findByEmail).mockResolvedValue(
        createUserRecord({ status: USER_STATUS.LOCKED }),
      );

      await expect(
        service.login({ email: 'user@example.com', password: 'whatever' }, CLIENT_IP),
      ).rejects.toBeInstanceOf(AccountLockedException);
      expect(mocks.passwordHasher.verify).not.toHaveBeenCalled();
    });

    it('tài khoản đang bị khóa tạm (lockedUntil > now, brute-force C-5) → AccountTemporarilyLockedException kèm retryAfterSeconds', async () => {
      const { service, mocks } = await createAuthService();
      const lockedUntil = new Date(Date.now() + 10 * 60 * 1000); // 10 phút nữa
      vi.mocked(mocks.userRepository.findByEmail).mockResolvedValue(
        createUserRecord({ status: USER_STATUS.ACTIVE, lockedUntil }),
      );

      const error: unknown = await service
        .login({ email: 'user@example.com', password: 'whatever' }, CLIENT_IP)
        .catch((err: unknown) => err);

      expect(error).toBeInstanceOf(AccountTemporarilyLockedException);
      expect((error as AccountTemporarilyLockedException).retryAfterSeconds).toBeGreaterThan(0);
      expect(mocks.passwordHasher.verify).not.toHaveBeenCalled();
    });

    it('tài khoản PENDING_VERIFICATION → EmailNotVerifiedException, không kiểm tra mật khẩu', async () => {
      const { service, mocks } = await createAuthService();
      vi.mocked(mocks.userRepository.findByEmail).mockResolvedValue(
        createUserRecord({ status: USER_STATUS.PENDING_VERIFICATION }),
      );

      await expect(
        service.login({ email: 'user@example.com', password: 'whatever' }, CLIENT_IP),
      ).rejects.toBeInstanceOf(EmailNotVerifiedException);
      expect(mocks.passwordHasher.verify).not.toHaveBeenCalled();
    });

    it('mật khẩu sai (tài khoản ACTIVE) → registerFailedLoginAttempt + InvalidCredentialsException', async () => {
      const { service, mocks } = await createAuthService();
      vi.mocked(mocks.userRepository.findByEmail).mockResolvedValue(
        createUserRecord({ status: USER_STATUS.ACTIVE }),
      );
      vi.mocked(mocks.passwordHasher.verify).mockResolvedValue(false);

      await expect(
        service.login({ email: 'user@example.com', password: 'wrong-password' }, CLIENT_IP),
      ).rejects.toBeInstanceOf(InvalidCredentialsException);
      expect(mocks.userRepository.registerFailedLoginAttempt).toHaveBeenCalledWith('user-id-1');
    });

    it('[Regression chống lộ thông tin] "email không tồn tại" và "mật khẩu sai" ném CÙNG class, CÙNG errorCode/message', async () => {
      const { service: serviceA, mocks: mocksA } = await createAuthService();
      vi.mocked(mocksA.userRepository.findByEmail).mockResolvedValue(null);
      const errorUserNotFound: unknown = await serviceA
        .login({ email: 'nobody@example.com', password: 'anything' }, CLIENT_IP)
        .catch((err: unknown) => err);

      const { service: serviceB, mocks: mocksB } = await createAuthService();
      vi.mocked(mocksB.userRepository.findByEmail).mockResolvedValue(
        createUserRecord({ status: USER_STATUS.ACTIVE }),
      );
      vi.mocked(mocksB.passwordHasher.verify).mockResolvedValue(false);
      const errorWrongPassword: unknown = await serviceB
        .login({ email: 'user@example.com', password: 'wrong' }, CLIENT_IP)
        .catch((err: unknown) => err);

      expect(errorUserNotFound).toBeInstanceOf(InvalidCredentialsException);
      expect(errorWrongPassword).toBeInstanceOf(InvalidCredentialsException);
      expect((errorUserNotFound as InvalidCredentialsException).errorCode).toBe(
        (errorWrongPassword as InvalidCredentialsException).errorCode,
      );
      expect((errorUserNotFound as InvalidCredentialsException).message).toBe(
        (errorWrongPassword as InvalidCredentialsException).message,
      );
    });

    it('đăng nhập thành công: reset failedLoginAttempts, tạo session, trả đúng LoginResult', async () => {
      const { service, mocks } = await createAuthService();
      vi.mocked(mocks.userRepository.findByEmail).mockResolvedValue(
        createUserRecord({
          id: 'user-id-1',
          email: 'user@example.com',
          status: USER_STATUS.ACTIVE,
        }),
      );
      vi.mocked(mocks.passwordHasher.verify).mockResolvedValue(true);
      const sessionRecord = {
        id: 'session-abc',
        userId: 'user-id-1',
        roleSnapshot: 'ADMIN',
        createdAt: new Date(),
        expiresAt: new Date('2099-01-01T00:00:00.000Z'),
        revokedAt: null,
      };
      vi.mocked(mocks.sessionService.createSession).mockResolvedValue(sessionRecord);

      const result = await service.login(
        { email: 'user@example.com', password: 'correct-password' },
        CLIENT_IP,
      );

      expect(mocks.userRepository.resetFailedLoginAttempts).toHaveBeenCalledWith('user-id-1');
      expect(mocks.sessionService.createSession).toHaveBeenCalledWith('user-id-1');
      expect(result).toEqual({
        user: { id: 'user-id-1', email: 'user@example.com', role: 'ADMIN' },
        session: { id: 'session-abc', expiresAt: sessionRecord.expiresAt },
      });
    });
  });

  describe('verifyEmail', () => {
    it('token không khớp bản ghi nào → TokenInvalidException', async () => {
      const { service, mocks } = await createAuthService();
      vi.mocked(mocks.emailVerificationTokenRepository.findByTokenHash).mockResolvedValue(null);

      await expect(service.verifyEmail('bad-token', CLIENT_IP)).rejects.toBeInstanceOf(
        TokenInvalidException,
      );
    });

    it('token đã dùng trước đó → kết quả ALREADY_VERIFIED (idempotent, KHÔNG lỗi)', async () => {
      const { service, mocks } = await createAuthService();
      vi.mocked(mocks.emailVerificationTokenRepository.findByTokenHash).mockResolvedValue(
        createTokenRecord({ usedAt: new Date('2026-01-02T00:00:00.000Z') }),
      );
      vi.mocked(mocks.userRepository.findById).mockResolvedValue(
        createUserRecord({ email: 'already@example.com' }),
      );

      const result = await service.verifyEmail('used-token', CLIENT_IP);

      expect(result).toEqual({ status: 'ALREADY_VERIFIED', email: 'already@example.com' });
      expect(mocks.emailVerificationTokenRepository.markUsed).not.toHaveBeenCalled();
      expect(mocks.userRepository.markEmailVerified).not.toHaveBeenCalled();
    });

    it('token hết hạn (>24h), chưa dùng → TokenExpiredException', async () => {
      const { service, mocks } = await createAuthService();
      vi.mocked(mocks.emailVerificationTokenRepository.findByTokenHash).mockResolvedValue(
        createTokenRecord({ usedAt: null, expiresAt: new Date('2020-01-01T00:00:00.000Z') }),
      );

      await expect(service.verifyEmail('expired-token', CLIENT_IP)).rejects.toBeInstanceOf(
        TokenExpiredException,
      );
      expect(mocks.emailVerificationTokenRepository.markUsed).not.toHaveBeenCalled();
    });

    it('token còn hạn, chưa dùng → VERIFIED, markUsed + markEmailVerified được gọi', async () => {
      const { service, mocks } = await createAuthService();
      const tokenRecord = createTokenRecord({ id: 42n, userId: 'user-id-1' });
      vi.mocked(mocks.emailVerificationTokenRepository.findByTokenHash).mockResolvedValue(
        tokenRecord,
      );
      vi.mocked(mocks.userRepository.findById).mockResolvedValue(
        createUserRecord({ email: 'verified@example.com' }),
      );

      const result = await service.verifyEmail('valid-token', CLIENT_IP);

      expect(result).toEqual({ status: 'VERIFIED', email: 'verified@example.com' });
      expect(mocks.emailVerificationTokenRepository.markUsed).toHaveBeenCalledWith(42n);
      expect(mocks.userRepository.markEmailVerified).toHaveBeenCalledWith('user-id-1');
    });

    it('gọi lại 2 lần cùng token hợp lệ: lần 1 VERIFIED, lần 2 (đã dùng) ALREADY_VERIFIED', async () => {
      const { service, mocks } = await createAuthService();
      const tokenRecord = createTokenRecord({ id: 1n, userId: 'user-id-1', usedAt: null });
      vi.mocked(mocks.emailVerificationTokenRepository.findByTokenHash).mockResolvedValueOnce(
        tokenRecord,
      );
      vi.mocked(mocks.userRepository.findById).mockResolvedValue(createUserRecord());

      const firstResult = await service.verifyEmail('same-token', CLIENT_IP);
      expect(firstResult.status).toBe('VERIFIED');

      vi.mocked(mocks.emailVerificationTokenRepository.findByTokenHash).mockResolvedValueOnce({
        ...tokenRecord,
        usedAt: new Date(),
      });
      const secondResult = await service.verifyEmail('same-token', CLIENT_IP);
      expect(secondResult.status).toBe('ALREADY_VERIFIED');
    });
  });

  describe('resendVerification — luôn im lặng, không lộ tồn tại email', () => {
    it('email không tồn tại → không throw, không gửi email', async () => {
      const { service, mocks } = await createAuthService();
      vi.mocked(mocks.userRepository.findByEmail).mockResolvedValue(null);

      await expect(
        service.resendVerification({ email: 'nobody@example.com' }, CLIENT_IP),
      ).resolves.toBeUndefined();
      expect(mocks.emailSender.sendEmailVerification).not.toHaveBeenCalled();
    });

    it('email tồn tại nhưng đã ACTIVE (verified rồi) → không gửi lại email', async () => {
      const { service, mocks } = await createAuthService();
      vi.mocked(mocks.userRepository.findByEmail).mockResolvedValue(
        createUserRecord({ status: USER_STATUS.ACTIVE }),
      );

      await service.resendVerification({ email: 'user@example.com' }, CLIENT_IP);

      expect(mocks.emailSender.sendEmailVerification).not.toHaveBeenCalled();
    });

    it('email tồn tại và PENDING_VERIFICATION → phát hành token mới và gửi email', async () => {
      const { service, mocks } = await createAuthService();
      vi.mocked(mocks.userRepository.findByEmail).mockResolvedValue(
        createUserRecord({ id: 'user-id-1', status: USER_STATUS.PENDING_VERIFICATION }),
      );

      await service.resendVerification({ email: 'user@example.com' }, CLIENT_IP);

      expect(
        mocks.emailVerificationTokenRepository.invalidateActiveTokensForUser,
      ).toHaveBeenCalledWith('user-id-1');
      expect(mocks.emailSender.sendEmailVerification).toHaveBeenCalled();
    });
  });

  describe('forgotPassword — luôn thành công im lặng', () => {
    it('email không tồn tại → resolve thành công, không tạo token/gửi email', async () => {
      const { service, mocks } = await createAuthService();
      vi.mocked(mocks.userRepository.findByEmail).mockResolvedValue(null);

      await expect(
        service.forgotPassword({ email: 'nobody@example.com' }, CLIENT_IP),
      ).resolves.toBeUndefined();
      expect(mocks.passwordResetTokenRepository.create).not.toHaveBeenCalled();
      expect(mocks.emailSender.sendPasswordReset).not.toHaveBeenCalled();
    });

    it('email tồn tại → vô hiệu token cũ, tạo token mới, gửi email reset', async () => {
      const { service, mocks } = await createAuthService();
      vi.mocked(mocks.userRepository.findByEmail).mockResolvedValue(
        createUserRecord({ id: 'user-id-1', email: 'user@example.com' }),
      );

      await service.forgotPassword({ email: 'user@example.com' }, CLIENT_IP);

      expect(mocks.passwordResetTokenRepository.invalidateActiveTokensForUser).toHaveBeenCalledWith(
        'user-id-1',
      );
      expect(mocks.passwordResetTokenRepository.create).toHaveBeenCalledWith(
        'user-id-1',
        expect.any(String),
        expect.any(Date),
      );
      expect(mocks.emailSender.sendPasswordReset).toHaveBeenCalledWith(
        expect.objectContaining({ toEmail: 'user@example.com' }),
      );
    });

    it('[Regression chống lộ thông tin] email tồn tại và không tồn tại đều resolve thành công (không phân biệt qua exception)', async () => {
      const { service: serviceA, mocks: mocksA } = await createAuthService();
      vi.mocked(mocksA.userRepository.findByEmail).mockResolvedValue(null);
      const resultA: unknown = await serviceA
        .forgotPassword({ email: 'nobody@example.com' }, CLIENT_IP)
        .then(() => 'resolved')
        .catch(() => 'rejected');

      const { service: serviceB, mocks: mocksB } = await createAuthService();
      vi.mocked(mocksB.userRepository.findByEmail).mockResolvedValue(createUserRecord());
      const resultB: unknown = await serviceB
        .forgotPassword({ email: 'user@example.com' }, CLIENT_IP)
        .then(() => 'resolved')
        .catch(() => 'rejected');

      expect(resultA).toBe('resolved');
      expect(resultB).toBe('resolved');
    });
  });

  describe('resetPassword', () => {
    it('token không tồn tại → TokenInvalidException', async () => {
      const { service, mocks } = await createAuthService();
      vi.mocked(mocks.passwordResetTokenRepository.findByTokenHash).mockResolvedValue(null);

      await expect(
        service.resetPassword({ token: 'bad-token', newPassword: 'NewStr0ngPass1' }, CLIENT_IP),
      ).rejects.toBeInstanceOf(TokenInvalidException);
    });

    it('token đã dùng → TokenAlreadyUsedException (KHÁC hành vi verify-email)', async () => {
      const { service, mocks } = await createAuthService();
      vi.mocked(mocks.passwordResetTokenRepository.findByTokenHash).mockResolvedValue(
        createTokenRecord({ usedAt: new Date('2026-01-02T00:00:00.000Z') }),
      );

      await expect(
        service.resetPassword({ token: 'used-token', newPassword: 'NewStr0ngPass1' }, CLIENT_IP),
      ).rejects.toBeInstanceOf(TokenAlreadyUsedException);
      expect(mocks.userRepository.updatePasswordHash).not.toHaveBeenCalled();
    });

    it('token hết hạn, chưa dùng → TokenExpiredException', async () => {
      const { service, mocks } = await createAuthService();
      vi.mocked(mocks.passwordResetTokenRepository.findByTokenHash).mockResolvedValue(
        createTokenRecord({ usedAt: null, expiresAt: new Date('2020-01-01T00:00:00.000Z') }),
      );

      await expect(
        service.resetPassword({ token: 'expired-token', newPassword: 'NewStr0ngPass1' }, CLIENT_IP),
      ).rejects.toBeInstanceOf(TokenExpiredException);
    });

    it('mật khẩu mới trùng mật khẩu cũ → PasswordSameAsOldException, không update', async () => {
      const { service, mocks } = await createAuthService();
      vi.mocked(mocks.passwordResetTokenRepository.findByTokenHash).mockResolvedValue(
        createTokenRecord({ userId: 'user-id-1' }),
      );
      vi.mocked(mocks.userRepository.findById).mockResolvedValue(createUserRecord());
      vi.mocked(mocks.passwordHasher.verify).mockResolvedValue(true);

      await expect(
        service.resetPassword({ token: 'valid-token', newPassword: 'SamePassword1' }, CLIENT_IP),
      ).rejects.toBeInstanceOf(PasswordSameAsOldException);
      expect(mocks.userRepository.updatePasswordHash).not.toHaveBeenCalled();
    });

    it('hợp lệ + mật khẩu mới khác cũ → update password, markUsed, revoke toàn bộ session của user', async () => {
      const { service, mocks } = await createAuthService();
      const tokenRecord = createTokenRecord({ id: 7n, userId: 'user-id-1' });
      vi.mocked(mocks.passwordResetTokenRepository.findByTokenHash).mockResolvedValue(tokenRecord);
      vi.mocked(mocks.userRepository.findById).mockResolvedValue(createUserRecord());
      vi.mocked(mocks.passwordHasher.verify).mockResolvedValue(false);

      await service.resetPassword(
        { token: 'valid-token', newPassword: 'NewStr0ngPass1' },
        CLIENT_IP,
      );

      expect(mocks.userRepository.updatePasswordHash).toHaveBeenCalledWith(
        'user-id-1',
        'hashed:NewStr0ngPass1',
      );
      expect(mocks.passwordResetTokenRepository.markUsed).toHaveBeenCalledWith(7n);
      expect(mocks.sessionService.revokeAllSessionsForUser).toHaveBeenCalledWith('user-id-1');
    });
  });

  describe('logout', () => {
    it('gọi sessionService.revokeSession với đúng sessionId', async () => {
      const { service, mocks } = await createAuthService();

      await service.logout('session-id-to-revoke');

      expect(mocks.sessionService.revokeSession).toHaveBeenCalledWith('session-id-to-revoke');
    });
  });
});
