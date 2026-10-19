/* eslint-disable @typescript-eslint/unbound-method --
 * Rule báo sai trên idiom chuẩn của Vitest mocking: tham chiếu trực tiếp 1
 * method của object mock (vd `expect(mocks.x.method).toHaveBeenCalledWith(...)`,
 * `vi.mocked(mocks.x.method)`) để assert — các method này là `vi.fn()`
 * không dùng `this`, không có rủi ro mất ngữ cảnh `this` thật như rule giả định. */
import { RateLimitExceededException } from '../common/exceptions/rate-limit-exceeded.exception.js';
import type { PrismaService } from '../common/prisma/prisma.service.js';
import type { RateLimiter } from '../common/rate-limit/rate-limiter.interface.js';
import type { LastAdminPolicyService } from '../rbac/last-admin-policy.service.js';
import { ROLE_NAME } from '../rbac/role.constants.js';
import type { SessionService } from '../session/session.service.js';

import { AdminService } from './admin.service.js';
import { ConflictAccountDeactivatedException } from './exceptions/conflict-account-deactivated.exception.js';
import { UserNotFoundException } from './exceptions/user-not-found.exception.js';
import type { AdminActionLogRepository } from './repositories/admin-action-log-repository.interface.js';
import { ADMIN_ACTION_TYPE } from './repositories/admin-action-log-repository.interface.js';
import type {
  AdminTargetUserRecord,
  ListUsersResult,
} from './repositories/admin-user-record.interface.js';
import type { AdminUserRepository } from './repositories/admin-user-repository.interface.js';

const FAKE_TX = { marker: 'fake-tx' } as never;

function createTargetRecord(overrides: Partial<AdminTargetUserRecord> = {}): AdminTargetUserRecord {
  return {
    id: 'target-user-id',
    status: 'ACTIVE',
    roleName: ROLE_NAME.USER,
    ...overrides,
  };
}

interface Mocks {
  prisma: PrismaService;
  adminUserRepository: AdminUserRepository;
  adminActionLogRepository: AdminActionLogRepository;
  lastAdminPolicyService: LastAdminPolicyService;
  sessionService: SessionService;
  rateLimiter: RateLimiter;
}

function createService(): { service: AdminService; mocks: Mocks } {
  const mocks: Mocks = {
    prisma: {
      $transaction: vi.fn(async (cb: (tx: never) => Promise<unknown>) => cb(FAKE_TX)),
    } as unknown as PrismaService,
    adminUserRepository: {
      findManyWithFilters: vi.fn(),
      findTargetForModeration: vi.fn().mockResolvedValue(createTargetRecord()),
      updateStatus: vi.fn().mockResolvedValue(undefined),
      changeUserRole: vi.fn().mockResolvedValue(undefined),
    },
    adminActionLogRepository: {
      record: vi.fn().mockResolvedValue(undefined),
    },
    lastAdminPolicyService: {
      assertActionPreservesLastAdmin: vi.fn().mockResolvedValue(undefined),
    },
    sessionService: {
      revokeAllSessionsForUser: vi.fn().mockResolvedValue(undefined),
    } as unknown as SessionService,
    rateLimiter: {
      consume: vi
        .fn()
        .mockResolvedValue({ allowed: true, remainingAttempts: 29, retryAfterSeconds: 0 }),
    },
  };

  const service = new AdminService(
    mocks.prisma,
    mocks.adminUserRepository,
    mocks.adminActionLogRepository,
    mocks.lastAdminPolicyService,
    mocks.sessionService,
    mocks.rateLimiter,
  );

  return { service, mocks };
}

describe('AdminService', () => {
  describe('listUsers', () => {
    it('tính đúng totalPages = ceil(totalItems/limit)', async () => {
      const { service, mocks } = createService();
      const result: ListUsersResult = {
        items: [],
        totalItems: 23,
      };
      vi.mocked(mocks.adminUserRepository.findManyWithFilters).mockResolvedValue(result);

      const page = await service.listUsers({ page: 1, limit: 10 });

      expect(page.meta).toEqual({ page: 1, limit: 10, totalItems: 23, totalPages: 3 });
    });

    it('totalItems chia hết đúng limit → totalPages không dư trang', async () => {
      const { service, mocks } = createService();
      vi.mocked(mocks.adminUserRepository.findManyWithFilters).mockResolvedValue({
        items: [],
        totalItems: 20,
      });

      const page = await service.listUsers({ page: 2, limit: 10 });

      expect(page.meta.totalPages).toBe(2);
    });

    it('totalItems = 0 → totalPages = 0', async () => {
      const { service, mocks } = createService();
      vi.mocked(mocks.adminUserRepository.findManyWithFilters).mockResolvedValue({
        items: [],
        totalItems: 0,
      });

      const page = await service.listUsers({ page: 1, limit: 10 });

      expect(page.meta.totalPages).toBe(0);
    });
  });

  describe('lockUser', () => {
    it('target không tồn tại → UserNotFoundException', async () => {
      const { service, mocks } = createService();
      vi.mocked(mocks.adminUserRepository.findTargetForModeration).mockResolvedValue(null);

      await expect(service.lockUser('missing-user', 'admin-actor')).rejects.toBeInstanceOf(
        UserNotFoundException,
      );
    });

    it('target DEACTIVATED → ConflictAccountDeactivatedException', async () => {
      const { service, mocks } = createService();
      vi.mocked(mocks.adminUserRepository.findTargetForModeration).mockResolvedValue(
        createTargetRecord({ status: 'DEACTIVATED' }),
      );

      await expect(service.lockUser('target-user-id', 'admin-actor')).rejects.toBeInstanceOf(
        ConflictAccountDeactivatedException,
      );
    });

    it('target đã LOCKED (idempotent) → trả về luôn, KHÔNG gọi lastAdminPolicyService/updateStatus/record/revokeAllSessionsForUser', async () => {
      const { service, mocks } = createService();
      vi.mocked(mocks.adminUserRepository.findTargetForModeration).mockResolvedValue(
        createTargetRecord({ status: 'LOCKED' }),
      );

      const result = await service.lockUser('target-user-id', 'admin-actor');

      expect(result).toEqual({ id: 'target-user-id', status: 'LOCKED' });
      expect(mocks.lastAdminPolicyService.assertActionPreservesLastAdmin).not.toHaveBeenCalled();
      expect(mocks.adminUserRepository.updateStatus).not.toHaveBeenCalled();
      expect(mocks.adminActionLogRepository.record).not.toHaveBeenCalled();
      expect(mocks.sessionService.revokeAllSessionsForUser).not.toHaveBeenCalled();
    });

    it('target ACTIVE hợp lệ → gọi đủ 4 bước đúng thứ tự, revoke được gọi VỚI tham số tx', async () => {
      const { service, mocks } = createService();
      vi.mocked(mocks.adminUserRepository.findTargetForModeration).mockResolvedValue(
        createTargetRecord({ status: 'ACTIVE' }),
      );

      const result = await service.lockUser('target-user-id', 'admin-actor-id');

      expect(result).toEqual({ id: 'target-user-id', status: 'LOCKED' });
      expect(mocks.lastAdminPolicyService.assertActionPreservesLastAdmin).toHaveBeenCalledWith(
        FAKE_TX,
        { targetUserId: 'target-user-id', willTargetRemainActiveAdminAfterAction: false },
      );
      expect(mocks.adminUserRepository.updateStatus).toHaveBeenCalledWith(
        FAKE_TX,
        'target-user-id',
        'LOCKED',
      );
      expect(mocks.adminActionLogRepository.record).toHaveBeenCalledWith(FAKE_TX, {
        actionType: ADMIN_ACTION_TYPE.LOCK,
        targetUserId: 'target-user-id',
        performedByAdminId: 'admin-actor-id',
        previousValue: 'ACTIVE',
        newValue: 'LOCKED',
      });
      expect(mocks.sessionService.revokeAllSessionsForUser).toHaveBeenCalledWith(
        'target-user-id',
        FAKE_TX,
      );

      const assertOrder = vi.mocked(mocks.lastAdminPolicyService.assertActionPreservesLastAdmin)
        .mock.invocationCallOrder[0];
      const updateStatusOrder = vi.mocked(mocks.adminUserRepository.updateStatus).mock
        .invocationCallOrder[0];
      const recordOrder = vi.mocked(mocks.adminActionLogRepository.record).mock
        .invocationCallOrder[0];
      const revokeOrder = vi.mocked(mocks.sessionService.revokeAllSessionsForUser).mock
        .invocationCallOrder[0];
      expect(assertOrder).toBeLessThan(updateStatusOrder);
      expect(updateStatusOrder).toBeLessThan(recordOrder);
      expect(recordOrder).toBeLessThan(revokeOrder);
    });

    it('vượt rate-limit (T10) → RateLimitExceededException, KHÔNG chạm transaction', async () => {
      const { service, mocks } = createService();
      vi.mocked(mocks.rateLimiter.consume).mockResolvedValue({
        allowed: false,
        remainingAttempts: 0,
        retryAfterSeconds: 120,
      });

      await expect(service.lockUser('target-user-id', 'admin-actor')).rejects.toBeInstanceOf(
        RateLimitExceededException,
      );
      expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('unlockUser', () => {
    it('target không tồn tại → UserNotFoundException', async () => {
      const { service, mocks } = createService();
      vi.mocked(mocks.adminUserRepository.findTargetForModeration).mockResolvedValue(null);

      await expect(service.unlockUser('missing-user', 'admin-actor')).rejects.toBeInstanceOf(
        UserNotFoundException,
      );
    });

    it('target DEACTIVATED → ConflictAccountDeactivatedException', async () => {
      const { service, mocks } = createService();
      vi.mocked(mocks.adminUserRepository.findTargetForModeration).mockResolvedValue(
        createTargetRecord({ status: 'DEACTIVATED' }),
      );

      await expect(service.unlockUser('target-user-id', 'admin-actor')).rejects.toBeInstanceOf(
        ConflictAccountDeactivatedException,
      );
    });

    it('target đã ACTIVE (idempotent) → trả về luôn, KHÔNG gọi updateStatus/record', async () => {
      const { service, mocks } = createService();
      vi.mocked(mocks.adminUserRepository.findTargetForModeration).mockResolvedValue(
        createTargetRecord({ status: 'ACTIVE' }),
      );

      const result = await service.unlockUser('target-user-id', 'admin-actor');

      expect(result).toEqual({ id: 'target-user-id', status: 'ACTIVE' });
      expect(mocks.adminUserRepository.updateStatus).not.toHaveBeenCalled();
      expect(mocks.adminActionLogRepository.record).not.toHaveBeenCalled();
    });

    it('target LOCKED hợp lệ → updateStatus + record, KHÔNG gọi lastAdminPolicyService (unlock không giảm số ADMIN)', async () => {
      const { service, mocks } = createService();
      vi.mocked(mocks.adminUserRepository.findTargetForModeration).mockResolvedValue(
        createTargetRecord({ status: 'LOCKED' }),
      );

      const result = await service.unlockUser('target-user-id', 'admin-actor-id');

      expect(result).toEqual({ id: 'target-user-id', status: 'ACTIVE' });
      expect(mocks.lastAdminPolicyService.assertActionPreservesLastAdmin).not.toHaveBeenCalled();
      expect(mocks.adminUserRepository.updateStatus).toHaveBeenCalledWith(
        FAKE_TX,
        'target-user-id',
        'ACTIVE',
      );
      expect(mocks.adminActionLogRepository.record).toHaveBeenCalledWith(FAKE_TX, {
        actionType: ADMIN_ACTION_TYPE.UNLOCK,
        targetUserId: 'target-user-id',
        performedByAdminId: 'admin-actor-id',
        previousValue: 'LOCKED',
        newValue: 'ACTIVE',
      });
      expect(mocks.sessionService.revokeAllSessionsForUser).not.toHaveBeenCalled();
    });

    it('vượt rate-limit (T10) → RateLimitExceededException, KHÔNG chạm transaction', async () => {
      const { service, mocks } = createService();
      vi.mocked(mocks.rateLimiter.consume).mockResolvedValue({
        allowed: false,
        remainingAttempts: 0,
        retryAfterSeconds: 120,
      });

      await expect(service.unlockUser('target-user-id', 'admin-actor')).rejects.toBeInstanceOf(
        RateLimitExceededException,
      );
      expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('changeRole', () => {
    it('target không tồn tại → UserNotFoundException', async () => {
      const { service, mocks } = createService();
      vi.mocked(mocks.adminUserRepository.findTargetForModeration).mockResolvedValue(null);

      await expect(
        service.changeRole('missing-user', ROLE_NAME.ADMIN, 'admin-actor'),
      ).rejects.toBeInstanceOf(UserNotFoundException);
    });

    it('target DEACTIVATED → ConflictAccountDeactivatedException', async () => {
      const { service, mocks } = createService();
      vi.mocked(mocks.adminUserRepository.findTargetForModeration).mockResolvedValue(
        createTargetRecord({ status: 'DEACTIVATED' }),
      );

      await expect(
        service.changeRole('target-user-id', ROLE_NAME.ADMIN, 'admin-actor'),
      ).rejects.toBeInstanceOf(ConflictAccountDeactivatedException);
    });

    it('role trùng hiện tại → idempotent, KHÔNG gọi lastAdminPolicyService/changeUserRole/record/revokeAllSessionsForUser', async () => {
      const { service, mocks } = createService();
      vi.mocked(mocks.adminUserRepository.findTargetForModeration).mockResolvedValue(
        createTargetRecord({ roleName: ROLE_NAME.USER }),
      );

      const result = await service.changeRole('target-user-id', ROLE_NAME.USER, 'admin-actor');

      expect(result).toEqual({ id: 'target-user-id', role: ROLE_NAME.USER });
      expect(mocks.lastAdminPolicyService.assertActionPreservesLastAdmin).not.toHaveBeenCalled();
      expect(mocks.adminUserRepository.changeUserRole).not.toHaveBeenCalled();
      expect(mocks.adminActionLogRepository.record).not.toHaveBeenCalled();
      expect(mocks.sessionService.revokeAllSessionsForUser).not.toHaveBeenCalled();
    });

    it('thăng cấp USER→ADMIN → KHÔNG gọi lastAdminPolicyService/revokeAllSessionsForUser, CÓ gọi changeUserRole+record', async () => {
      const { service, mocks } = createService();
      vi.mocked(mocks.adminUserRepository.findTargetForModeration).mockResolvedValue(
        createTargetRecord({ roleName: ROLE_NAME.USER }),
      );

      const result = await service.changeRole('target-user-id', ROLE_NAME.ADMIN, 'admin-actor-id');

      expect(result).toEqual({ id: 'target-user-id', role: ROLE_NAME.ADMIN });
      expect(mocks.lastAdminPolicyService.assertActionPreservesLastAdmin).not.toHaveBeenCalled();
      expect(mocks.sessionService.revokeAllSessionsForUser).not.toHaveBeenCalled();
      expect(mocks.adminUserRepository.changeUserRole).toHaveBeenCalledWith(
        FAKE_TX,
        'target-user-id',
        ROLE_NAME.ADMIN,
      );
      expect(mocks.adminActionLogRepository.record).toHaveBeenCalledWith(FAKE_TX, {
        actionType: ADMIN_ACTION_TYPE.ROLE_CHANGE,
        targetUserId: 'target-user-id',
        performedByAdminId: 'admin-actor-id',
        previousValue: ROLE_NAME.USER,
        newValue: ROLE_NAME.ADMIN,
      });
    });

    it('hạ cấp ADMIN→USER → CÓ gọi lastAdminPolicyService TRƯỚC, CÓ gọi revokeAllSessionsForUser VỚI tham số tx SAU changeUserRole+record', async () => {
      const { service, mocks } = createService();
      vi.mocked(mocks.adminUserRepository.findTargetForModeration).mockResolvedValue(
        createTargetRecord({ roleName: ROLE_NAME.ADMIN }),
      );

      const result = await service.changeRole('target-user-id', ROLE_NAME.USER, 'admin-actor-id');

      expect(result).toEqual({ id: 'target-user-id', role: ROLE_NAME.USER });
      expect(mocks.lastAdminPolicyService.assertActionPreservesLastAdmin).toHaveBeenCalledWith(
        FAKE_TX,
        { targetUserId: 'target-user-id', willTargetRemainActiveAdminAfterAction: false },
      );
      expect(mocks.adminUserRepository.changeUserRole).toHaveBeenCalledWith(
        FAKE_TX,
        'target-user-id',
        ROLE_NAME.USER,
      );
      expect(mocks.adminActionLogRepository.record).toHaveBeenCalledWith(FAKE_TX, {
        actionType: ADMIN_ACTION_TYPE.ROLE_CHANGE,
        targetUserId: 'target-user-id',
        performedByAdminId: 'admin-actor-id',
        previousValue: ROLE_NAME.ADMIN,
        newValue: ROLE_NAME.USER,
      });
      expect(mocks.sessionService.revokeAllSessionsForUser).toHaveBeenCalledWith(
        'target-user-id',
        FAKE_TX,
      );

      const assertOrder = vi.mocked(mocks.lastAdminPolicyService.assertActionPreservesLastAdmin)
        .mock.invocationCallOrder[0];
      const changeRoleOrder = vi.mocked(mocks.adminUserRepository.changeUserRole).mock
        .invocationCallOrder[0];
      const recordOrder = vi.mocked(mocks.adminActionLogRepository.record).mock
        .invocationCallOrder[0];
      const revokeOrder = vi.mocked(mocks.sessionService.revokeAllSessionsForUser).mock
        .invocationCallOrder[0];
      expect(assertOrder).toBeLessThan(changeRoleOrder);
      expect(changeRoleOrder).toBeLessThan(recordOrder);
      expect(recordOrder).toBeLessThan(revokeOrder);
    });
  });
});
