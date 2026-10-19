import { Inject, Injectable } from '@nestjs/common';

import { RateLimitExceededException } from '../common/exceptions/rate-limit-exceeded.exception.js';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { RATE_LIMITER, type RateLimiter } from '../common/rate-limit/rate-limiter.interface.js';
import { LastAdminPolicyService } from '../rbac/last-admin-policy.service.js';
import { ROLE_NAME, type RoleName } from '../rbac/role.constants.js';
import { SessionService } from '../session/session.service.js';

import {
  AdminRoleChangeResult,
  AdminUserStatusResult,
  PaginatedAdminUserList,
} from './admin-results.interface.js';
import { ConflictAccountDeactivatedException } from './exceptions/conflict-account-deactivated.exception.js';
import { UserNotFoundException } from './exceptions/user-not-found.exception.js';
import { ADMIN_LOCK_UNLOCK_RATE_LIMIT } from './rate-limit-policies.js';
import {
  ADMIN_ACTION_LOG_REPOSITORY,
  ADMIN_ACTION_TYPE,
  type AdminActionLogRepository,
} from './repositories/admin-action-log-repository.interface.js';
import { ListUsersFilter } from './repositories/admin-user-record.interface.js';
import {
  ADMIN_USER_REPOSITORY,
  type AdminUserRepository,
} from './repositories/admin-user-repository.interface.js';

const ACTIVE_STATUS = 'ACTIVE';
const LOCKED_STATUS = 'LOCKED';
const DEACTIVATED_STATUS = 'DEACTIVATED';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ADMIN_USER_REPOSITORY) private readonly adminUserRepository: AdminUserRepository,
    @Inject(ADMIN_ACTION_LOG_REPOSITORY)
    private readonly adminActionLogRepository: AdminActionLogRepository,
    private readonly lastAdminPolicyService: LastAdminPolicyService,
    private readonly sessionService: SessionService,
    @Inject(RATE_LIMITER) private readonly rateLimiter: RateLimiter,
  ) {}

  async listUsers(filter: ListUsersFilter): Promise<PaginatedAdminUserList> {
    const { items, totalItems } = await this.adminUserRepository.findManyWithFilters(filter);
    return {
      items,
      meta: {
        page: filter.page,
        limit: filter.limit,
        totalItems,
        totalPages: Math.ceil(totalItems / filter.limit),
      },
    };
  }

  async lockUser(targetUserId: string, actorAdminId: string): Promise<AdminUserStatusResult> {
    await this.consumeAdminActionRateLimit(actorAdminId);
    return this.prisma.$transaction(async (tx) => {
      const target = await this.adminUserRepository.findTargetForModeration(tx, targetUserId);
      if (target === null) {
        throw new UserNotFoundException();
      }
      if (target.status === DEACTIVATED_STATUS) {
        throw new ConflictAccountDeactivatedException();
      }
      if (target.status === LOCKED_STATUS) {
        return { id: target.id, status: LOCKED_STATUS };
      }

      await this.lastAdminPolicyService.assertActionPreservesLastAdmin(tx, {
        targetUserId,
        willTargetRemainActiveAdminAfterAction: false,
      });

      await this.adminUserRepository.updateStatus(tx, targetUserId, LOCKED_STATUS);
      await this.adminActionLogRepository.record(tx, {
        actionType: ADMIN_ACTION_TYPE.LOCK,
        targetUserId,
        performedByAdminId: actorAdminId,
        previousValue: target.status,
        newValue: LOCKED_STATUS,
      });
      // ADR-0001: khóa + revoke toàn bộ session của target PHẢI cùng transaction.
      await this.sessionService.revokeAllSessionsForUser(targetUserId, tx);

      return { id: target.id, status: LOCKED_STATUS };
    });
  }

  async unlockUser(targetUserId: string, actorAdminId: string): Promise<AdminUserStatusResult> {
    await this.consumeAdminActionRateLimit(actorAdminId);
    return this.prisma.$transaction(async (tx) => {
      const target = await this.adminUserRepository.findTargetForModeration(tx, targetUserId);
      if (target === null) {
        throw new UserNotFoundException();
      }
      if (target.status === DEACTIVATED_STATUS) {
        throw new ConflictAccountDeactivatedException();
      }
      if (target.status === ACTIVE_STATUS) {
        return { id: target.id, status: ACTIVE_STATUS };
      }

      await this.adminUserRepository.updateStatus(tx, targetUserId, ACTIVE_STATUS);
      await this.adminActionLogRepository.record(tx, {
        actionType: ADMIN_ACTION_TYPE.UNLOCK,
        targetUserId,
        performedByAdminId: actorAdminId,
        previousValue: target.status,
        newValue: ACTIVE_STATUS,
      });

      return { id: target.id, status: ACTIVE_STATUS };
    });
  }

  async changeRole(
    targetUserId: string,
    newRole: RoleName,
    actorAdminId: string,
  ): Promise<AdminRoleChangeResult> {
    return this.prisma.$transaction(async (tx) => {
      const target = await this.adminUserRepository.findTargetForModeration(tx, targetUserId);
      if (target === null) {
        throw new UserNotFoundException();
      }
      if (target.status === DEACTIVATED_STATUS) {
        throw new ConflictAccountDeactivatedException();
      }
      if (target.roleName === newRole) {
        // Idempotent set-value (api-spec 5.4) — không đổi gì, không log, không revoke.
        return { id: target.id, role: newRole };
      }

      const isDemotionFromAdmin = target.roleName === ROLE_NAME.ADMIN && newRole === ROLE_NAME.USER;

      if (isDemotionFromAdmin) {
        // CHỈ gọi cho nhánh có khả năng mất ADMIN cuối — thăng cấp không bao giờ giảm số ADMIN.
        await this.lastAdminPolicyService.assertActionPreservesLastAdmin(tx, {
          targetUserId,
          willTargetRemainActiveAdminAfterAction: false,
        });
      }

      await this.adminUserRepository.changeUserRole(tx, targetUserId, newRole);
      await this.adminActionLogRepository.record(tx, {
        actionType: ADMIN_ACTION_TYPE.ROLE_CHANGE,
        targetUserId,
        performedByAdminId: actorAdminId,
        previousValue: target.roleName,
        newValue: newRole,
      });

      if (isDemotionFromAdmin) {
        // C-12 (T8) — BẮT BUỘC cùng transaction, khác nhánh thăng cấp (C-11:
        // có hiệu lực ở phiên đăng nhập tiếp theo, KHÔNG revoke).
        await this.sessionService.revokeAllSessionsForUser(targetUserId, tx);
      }

      return { id: target.id, role: newRole };
    });
  }

  /**
   * T10 — rate-limit nhẹ theo ACTOR admin (không theo IP, vì đây là hành
   * động của người đã xác thực) để hạn chế thiệt hại nếu 1 phiên ADMIN bị
   * compromise spam khóa/mở khóa hàng loạt.
   */
  private async consumeAdminActionRateLimit(actorAdminId: string): Promise<void> {
    const result = await this.rateLimiter.consume(
      `admin-lock-unlock:${actorAdminId}`,
      ADMIN_LOCK_UNLOCK_RATE_LIMIT,
    );
    if (!result.allowed) {
      throw new RateLimitExceededException(
        'ADMIN_LOCK_UNLOCK_RATE_LIMITED',
        'Quá nhiều hành động khóa/mở khóa trong thời gian ngắn. Vui lòng thử lại sau.',
        result.retryAfterSeconds,
      );
    }
  }
}
