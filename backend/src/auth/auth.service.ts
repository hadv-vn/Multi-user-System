import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { RateLimitExceededException } from '../common/exceptions/rate-limit-exceeded.exception.js';
import { RATE_LIMITER, type RateLimiter } from '../common/rate-limit/rate-limiter.interface.js';
import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from '../common/security/password-hasher.interface.js';
import { OpaqueTokenGenerator } from '../common/security/opaque-token-generator.service.js';
import { EMAIL_SENDER, type EmailSender } from '../email/email-sender.interface.js';
import { EmailDeliveryException } from '../email/exceptions/email-delivery.exception.js';
import { SessionService } from '../session/session.service.js';

import { LoginResult, RegisteredUserResult, VerifyEmailResult } from './auth-results.interface.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { ResendVerificationDto } from './dto/resend-verification.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { AccountLockedException } from './exceptions/account-locked.exception.js';
import { AccountTemporarilyLockedException } from './exceptions/account-temporarily-locked.exception.js';
import { DuplicateEmailException } from './exceptions/duplicate-email.exception.js';
import { EmailNotVerifiedException } from './exceptions/email-not-verified.exception.js';
import { InvalidCredentialsException } from './exceptions/invalid-credentials.exception.js';
import { PasswordSameAsOldException } from './exceptions/password-same-as-old.exception.js';
import { TokenAlreadyUsedException } from './exceptions/token-already-used.exception.js';
import { TokenExpiredException } from './exceptions/token-expired.exception.js';
import { TokenInvalidException } from './exceptions/token-invalid.exception.js';
import {
  EMAIL_VERIFICATION_TOKEN_REPOSITORY,
  type EmailVerificationTokenRepository,
} from './repositories/email-verification-token-repository.interface.js';
import {
  PASSWORD_RESET_TOKEN_REPOSITORY,
  type PasswordResetTokenRepository,
} from './repositories/password-reset-token-repository.interface.js';
import { USER_STATUS } from './repositories/user-record.interface.js';
import { USER_REPOSITORY, type UserRepository } from './repositories/user-repository.interface.js';
import {
  FORGOT_PASSWORD_RATE_LIMIT,
  LOGIN_RATE_LIMIT,
  REGISTER_RATE_LIMIT,
  RESEND_VERIFICATION_RATE_LIMIT,
  RESET_PASSWORD_RATE_LIMIT,
  VERIFY_EMAIL_RATE_LIMIT,
} from './rate-limit-policies.js';

const EMAIL_VERIFICATION_TOKEN_TTL_HOURS = 24;
const PASSWORD_RESET_TOKEN_TTL_HOURS = 24;
// Dùng để verify() khi email không tồn tại, nhằm cân bằng thời gian phản
// hồi với nhánh "sai mật khẩu" (chống timing attack — threat T5).
const DUMMY_PASSWORD = 'dummy-password-for-timing-safety-only';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  private dummyPasswordHash = '';

  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(EMAIL_VERIFICATION_TOKEN_REPOSITORY)
    private readonly emailVerificationTokenRepository: EmailVerificationTokenRepository,
    @Inject(PASSWORD_RESET_TOKEN_REPOSITORY)
    private readonly passwordResetTokenRepository: PasswordResetTokenRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(RATE_LIMITER) private readonly rateLimiter: RateLimiter,
    private readonly tokenGenerator: OpaqueTokenGenerator,
    @Inject(EMAIL_SENDER) private readonly emailSender: EmailSender,
    private readonly sessionService: SessionService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.dummyPasswordHash = await this.passwordHasher.hash(DUMMY_PASSWORD);
  }

  async register(dto: RegisterDto, clientIp: string): Promise<RegisteredUserResult> {
    await this.consumeRateLimit(
      `register:${clientIp}`,
      REGISTER_RATE_LIMIT,
      'REGISTRATION_RATE_LIMITED',
      'Quá nhiều yêu cầu đăng ký từ nguồn của bạn. Vui lòng thử lại sau.',
    );

    const email = this.normalizeEmail(dto.email);
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser !== null) {
      throw new DuplicateEmailException();
    }

    const passwordHash = await this.passwordHasher.hash(dto.password);
    const user = await this.userRepository.createWithDefaultRole({ email, passwordHash });

    await this.issueAndSendEmailVerificationToken(user.id, user.email);

    return {
      id: user.id,
      email: user.email,
      role: 'USER',
      status: user.status,
      createdAt: user.createdAt,
    };
  }

  async verifyEmail(token: string, clientIp: string): Promise<VerifyEmailResult> {
    await this.consumeRateLimit(
      `verify-email:${clientIp}`,
      VERIFY_EMAIL_RATE_LIMIT,
      'TOKEN_VERIFY_RATE_LIMITED',
      'Quá nhiều yêu cầu xác thực. Vui lòng thử lại sau.',
    );

    const tokenHash = this.tokenGenerator.hash(token);
    const tokenRecord = await this.emailVerificationTokenRepository.findByTokenHash(tokenHash);
    if (tokenRecord === null) {
      throw new TokenInvalidException();
    }

    const user = await this.userRepository.findById(tokenRecord.userId);
    if (tokenRecord.usedAt !== null) {
      return { status: 'ALREADY_VERIFIED', email: user?.email ?? '' };
    }
    if (tokenRecord.expiresAt.getTime() <= Date.now()) {
      throw new TokenExpiredException();
    }

    await this.emailVerificationTokenRepository.markUsed(tokenRecord.id);
    await this.userRepository.markEmailVerified(tokenRecord.userId);

    return { status: 'VERIFIED', email: user?.email ?? '' };
  }

  async resendVerification(dto: ResendVerificationDto, clientIp: string): Promise<void> {
    const email = this.normalizeEmail(dto.email);
    await this.consumeRateLimit(
      `resend-verification:${clientIp}:${email}`,
      RESEND_VERIFICATION_RATE_LIMIT,
      'RESEND_VERIFICATION_RATE_LIMITED',
      'Quá nhiều yêu cầu gửi lại email xác thực. Vui lòng thử lại sau.',
    );

    // Luôn trả về thành công "im lặng" — không tiết lộ email tồn tại hay
    // đã xác thực hay chưa (mở rộng nguyên tắc chống dò email, api-spec 1.7).
    const user = await this.userRepository.findByEmail(email);
    if (user !== null && user.status === USER_STATUS.PENDING_VERIFICATION) {
      await this.issueAndSendEmailVerificationToken(user.id, user.email);
    }
  }

  async login(dto: LoginDto, clientIp: string): Promise<LoginResult> {
    await this.consumeRateLimit(
      `login:${clientIp}`,
      LOGIN_RATE_LIMIT,
      'LOGIN_RATE_LIMITED',
      'Quá nhiều yêu cầu đăng nhập từ nguồn của bạn. Vui lòng thử lại sau.',
    );

    const email = this.normalizeEmail(dto.email);
    const user = await this.userRepository.findByEmail(email);

    if (user === null) {
      // T5: verify với dummy hash để cân bằng thời gian phản hồi với nhánh
      // "sai mật khẩu" bên dưới — kết quả không được dùng.
      await this.passwordHasher.verify(dto.password, this.dummyPasswordHash);
      throw new InvalidCredentialsException();
    }

    if (user.status === USER_STATUS.LOCKED) {
      throw new AccountLockedException();
    }

    if (user.lockedUntil !== null && user.lockedUntil.getTime() > Date.now()) {
      const retryAfterSeconds = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000);
      throw new AccountTemporarilyLockedException(retryAfterSeconds);
    }

    if (user.status === USER_STATUS.PENDING_VERIFICATION) {
      throw new EmailNotVerifiedException();
    }

    const passwordMatches = await this.passwordHasher.verify(dto.password, user.passwordHash);
    if (!passwordMatches) {
      await this.userRepository.registerFailedLoginAttempt(user.id);
      throw new InvalidCredentialsException();
    }

    await this.userRepository.resetFailedLoginAttempts(user.id);
    const session = await this.sessionService.createSession(user.id);

    return {
      user: { id: user.id, email: user.email, role: session.roleSnapshot },
      session: { id: session.id, expiresAt: session.expiresAt },
    };
  }

  async forgotPassword(dto: ForgotPasswordDto, clientIp: string): Promise<void> {
    await this.consumeRateLimit(
      `forgot-password:${clientIp}`,
      FORGOT_PASSWORD_RATE_LIMIT,
      'FORGOT_PASSWORD_RATE_LIMITED',
      'Quá nhiều yêu cầu đặt lại mật khẩu. Vui lòng thử lại sau.',
    );

    const email = this.normalizeEmail(dto.email);
    const user = await this.userRepository.findByEmail(email);
    if (user === null) {
      return;
    }

    await this.passwordResetTokenRepository.invalidateActiveTokensForUser(user.id);
    const { plainToken } = this.tokenGenerator.generate();
    const tokenHash = this.tokenGenerator.hash(plainToken);
    const expiresAt = this.addHours(new Date(), PASSWORD_RESET_TOKEN_TTL_HOURS);
    await this.passwordResetTokenRepository.create(user.id, tokenHash, expiresAt);

    const resetUrl = this.buildFrontendUrl('/reset-password', plainToken);
    await this.trySendEmail(() =>
      this.emailSender.sendPasswordReset({ toEmail: user.email, resetUrl }),
    );
  }

  async resetPassword(dto: ResetPasswordDto, clientIp: string): Promise<void> {
    await this.consumeRateLimit(
      `reset-password:${clientIp}`,
      RESET_PASSWORD_RATE_LIMIT,
      'RESET_PASSWORD_RATE_LIMITED',
      'Quá nhiều yêu cầu đặt lại mật khẩu. Vui lòng thử lại sau.',
    );

    const tokenHash = this.tokenGenerator.hash(dto.token);
    const tokenRecord = await this.passwordResetTokenRepository.findByTokenHash(tokenHash);
    if (tokenRecord === null) {
      throw new TokenInvalidException();
    }
    if (tokenRecord.usedAt !== null) {
      throw new TokenAlreadyUsedException();
    }
    if (tokenRecord.expiresAt.getTime() <= Date.now()) {
      throw new TokenExpiredException();
    }

    const user = await this.userRepository.findById(tokenRecord.userId);
    if (user !== null) {
      const samePassword = await this.passwordHasher.verify(dto.newPassword, user.passwordHash);
      if (samePassword) {
        throw new PasswordSameAsOldException();
      }
    }

    const newPasswordHash = await this.passwordHasher.hash(dto.newPassword);
    await this.userRepository.updatePasswordHash(tokenRecord.userId, newPasswordHash);
    await this.passwordResetTokenRepository.markUsed(tokenRecord.id);
    // Thu hồi toàn bộ session hiện có (khuyến nghị bảo mật, api-spec 2.6) —
    // phòng trường hợp mật khẩu bị lộ và có session cũ bị kẻ tấn công giữ.
    await this.sessionService.revokeAllSessionsForUser(tokenRecord.userId);
  }

  async logout(sessionId: string): Promise<void> {
    await this.sessionService.revokeSession(sessionId);
  }

  private async issueAndSendEmailVerificationToken(userId: string, email: string): Promise<void> {
    await this.emailVerificationTokenRepository.invalidateActiveTokensForUser(userId);
    const { plainToken } = this.tokenGenerator.generate();
    const tokenHash = this.tokenGenerator.hash(plainToken);
    const expiresAt = this.addHours(new Date(), EMAIL_VERIFICATION_TOKEN_TTL_HOURS);
    await this.emailVerificationTokenRepository.create(userId, tokenHash, expiresAt);

    const verificationUrl = this.buildFrontendUrl('/verify-email', plainToken);
    await this.trySendEmail(() =>
      this.emailSender.sendEmailVerification({ toEmail: email, verificationUrl }),
    );
  }

  /**
   * Lỗi gửi email KHÔNG được làm fail luồng chính (đăng ký/quên mật khẩu) —
   * chỉ log nội bộ, theo quyết định LLD Phase 1 (fire-and-forget, không
   * retry/queue ở giai đoạn này).
   */
  private async trySendEmail(send: () => Promise<void>): Promise<void> {
    try {
      await send();
    } catch (error) {
      if (!(error instanceof EmailDeliveryException)) {
        throw error;
      }
      this.logger.error('Gửi email thất bại (không chặn luồng chính):', error.cause);
    }
  }

  private async consumeRateLimit(
    key: string,
    policy: { maxAttempts: number; windowSeconds: number },
    errorCode: string,
    message: string,
  ): Promise<void> {
    const result = await this.rateLimiter.consume(key, policy);
    if (!result.allowed) {
      throw new RateLimitExceededException(errorCode, message, result.retryAfterSeconds);
    }
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private addHours(date: Date, hours: number): Date {
    return new Date(date.getTime() + hours * 60 * 60 * 1000);
  }

  private buildFrontendUrl(path: string, token: string): string {
    const baseUrl = this.configService.getOrThrow<string>('APP_BASE_URL');
    return `${baseUrl}${path}?token=${encodeURIComponent(token)}`;
  }
}
