import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../common/prisma/prisma.service.js';
import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from '../common/security/password-hasher.interface.js';
import { LastAdminPolicyService } from '../rbac/last-admin-policy.service.js';
import { SessionService } from '../session/session.service.js';

import { AccountProfileResult } from './account-results.interface.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { DeactivateAccountDto } from './dto/deactivate-account.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { CurrentPasswordIncorrectException } from './exceptions/current-password-incorrect.exception.js';
import { PasswordSameAsOldException } from './exceptions/password-same-as-old.exception.js';
import {
  ACCOUNT_USER_REPOSITORY,
  type AccountUserRepository,
} from './repositories/account-user-repository.interface.js';
import { AccountUserRecord } from './repositories/account-user-record.interface.js';

@Injectable()
export class AccountService {
  constructor(
    @Inject(ACCOUNT_USER_REPOSITORY)
    private readonly accountUserRepository: AccountUserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    private readonly prisma: PrismaService,
    private readonly lastAdminPolicyService: LastAdminPolicyService,
    private readonly sessionService: SessionService,
  ) {}

  async getMyProfile(userId: string, role: string): Promise<AccountProfileResult> {
    const user = await this.findUserOrThrowInvariantError(userId);
    return this.toProfileResult(user, role);
  }

  async updateProfile(
    userId: string,
    role: string,
    dto: UpdateProfileDto,
  ): Promise<AccountProfileResult> {
    await this.accountUserRepository.updateName(userId, dto.name);
    const user = await this.findUserOrThrowInvariantError(userId);
    return this.toProfileResult(user, role);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.findUserOrThrowInvariantError(userId);

    const isCurrentPasswordValid = await this.passwordHasher.verify(
      dto.currentPassword,
      user.passwordHash,
    );
    if (!isCurrentPasswordValid) {
      throw new CurrentPasswordIncorrectException();
    }

    if (dto.newPassword === dto.currentPassword) {
      throw new PasswordSameAsOldException();
    }

    const newPasswordHash = await this.passwordHasher.hash(dto.newPassword);
    await this.accountUserRepository.updatePasswordHash(userId, newPasswordHash);
  }

  async deactivateAccount(userId: string, dto: DeactivateAccountDto): Promise<void> {
    const user = await this.findUserOrThrowInvariantError(userId);

    const isPasswordValid = await this.passwordHasher.verify(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new CurrentPasswordIncorrectException();
    }

    await this.prisma.$transaction(async (tx) => {
      await this.lastAdminPolicyService.assertActionPreservesLastAdmin(tx, {
        targetUserId: userId,
        willTargetRemainActiveAdminAfterAction: false,
      });
      await this.accountUserRepository.deactivate(tx, userId);
    });

    await this.sessionService.revokeAllSessionsForUser(userId);
  }

  private async findUserOrThrowInvariantError(userId: string): Promise<AccountUserRecord> {
    const user = await this.accountUserRepository.findById(userId);
    if (user === null) {
      // Có session hợp lệ (AuthGuard đã xác thực) nhưng user không tồn tại
      // trong DB — vi phạm bất biến hệ thống, không phải input người dùng.
      throw new Error(
        `Vi phạm bất biến hệ thống: user ${userId} có session hợp lệ nhưng không tồn tại.`,
      );
    }
    return user;
  }

  private toProfileResult(user: AccountUserRecord, role: string): AccountProfileResult {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
