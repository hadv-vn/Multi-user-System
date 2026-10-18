/* eslint-disable @typescript-eslint/unbound-method --
 * Rule báo sai trên idiom chuẩn của Vitest mocking: tham chiếu trực tiếp 1
 * method của object mock (vd `expect(mocks.x.method).toHaveBeenCalledWith(...)`,
 * `vi.mocked(mocks.x.method)`) để assert — các method này là `vi.fn()`
 * không dùng `this`, không có rủi ro mất ngữ cảnh `this` thật như rule giả định. */
import type { PrismaService } from '../common/prisma/prisma.service.js';
import type { PasswordHasher } from '../common/security/password-hasher.interface.js';
import { LastAdminRuleViolationException } from '../rbac/exceptions/last-admin-rule-violation.exception.js';
import type { LastAdminPolicyService } from '../rbac/last-admin-policy.service.js';
import type { SessionService } from '../session/session.service.js';

import { AccountService } from './account.service.js';
import { CurrentPasswordIncorrectException } from './exceptions/current-password-incorrect.exception.js';
import { PasswordSameAsOldException } from './exceptions/password-same-as-old.exception.js';
import type { AccountUserRecord } from './repositories/account-user-record.interface.js';
import type { AccountUserRepository } from './repositories/account-user-repository.interface.js';

const FAKE_TX = {} as never;

function createAccountUserRecord(overrides: Partial<AccountUserRecord> = {}): AccountUserRecord {
  return {
    id: 'user-id-1',
    email: 'user@example.com',
    name: 'User Name',
    passwordHash: 'stored-password-hash',
    status: 'ACTIVE',
    emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

interface Mocks {
  accountUserRepository: AccountUserRepository;
  passwordHasher: PasswordHasher;
  prisma: PrismaService;
  lastAdminPolicyService: LastAdminPolicyService;
  sessionService: SessionService;
}

function createService(): { service: AccountService; mocks: Mocks } {
  const mocks: Mocks = {
    accountUserRepository: {
      findById: vi.fn().mockResolvedValue(createAccountUserRecord()),
      updateName: vi.fn().mockResolvedValue(undefined),
      updatePasswordHash: vi.fn().mockResolvedValue(undefined),
      deactivate: vi.fn().mockResolvedValue(undefined),
    },
    passwordHasher: {
      hash: vi.fn().mockImplementation((plain: string) => Promise.resolve(`hashed:${plain}`)),
      verify: vi.fn().mockResolvedValue(true),
    },
    prisma: {
      $transaction: vi.fn(async (cb: (tx: never) => Promise<unknown>) => cb(FAKE_TX)),
    } as unknown as PrismaService,
    lastAdminPolicyService: {
      assertActionPreservesLastAdmin: vi.fn().mockResolvedValue(undefined),
    },
    sessionService: {
      revokeAllSessionsForUser: vi.fn().mockResolvedValue(undefined),
    } as unknown as SessionService,
  };

  const service = new AccountService(
    mocks.accountUserRepository,
    mocks.passwordHasher,
    mocks.prisma,
    mocks.lastAdminPolicyService,
    mocks.sessionService,
  );

  return { service, mocks };
}

describe('AccountService', () => {
  describe('getMyProfile', () => {
    it('map đúng field từ AccountUserRecord, role lấy từ tham số truyền vào', async () => {
      const { service, mocks } = createService();
      vi.mocked(mocks.accountUserRepository.findById).mockResolvedValue(
        createAccountUserRecord({ id: 'user-id-1', email: 'profile@example.com', name: 'Profile' }),
      );

      const result = await service.getMyProfile('user-id-1', 'ADMIN');

      expect(result).toEqual({
        id: 'user-id-1',
        email: 'profile@example.com',
        name: 'Profile',
        role: 'ADMIN',
        status: 'ACTIVE',
        emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      });
    });

    it('user không tồn tại (vi phạm bất biến hệ thống) → ném Error', async () => {
      const { service, mocks } = createService();
      vi.mocked(mocks.accountUserRepository.findById).mockResolvedValue(null);

      await expect(service.getMyProfile('missing-user', 'USER')).rejects.toThrow(
        /Vi phạm bất biến hệ thống/,
      );
    });
  });

  describe('updateProfile', () => {
    it('gọi updateName rồi trả về profile với role từ tham số truyền vào (không tự tra DB role)', async () => {
      const { service, mocks } = createService();
      vi.mocked(mocks.accountUserRepository.findById).mockResolvedValue(
        createAccountUserRecord({ name: 'New Name' }),
      );

      const result = await service.updateProfile('user-id-1', 'USER', { name: 'New Name' });

      expect(mocks.accountUserRepository.updateName).toHaveBeenCalledWith(
        'user-id-1',
        'New Name',
      );
      expect(result.role).toBe('USER');
      expect(result.name).toBe('New Name');
    });
  });

  describe('changePassword', () => {
    it('mật khẩu hiện tại sai → CurrentPasswordIncorrectException, không gọi updatePasswordHash', async () => {
      const { service, mocks } = createService();
      vi.mocked(mocks.passwordHasher.verify).mockResolvedValue(false);

      await expect(
        service.changePassword('user-id-1', {
          currentPassword: 'wrong-current',
          newPassword: 'NewStr0ngPass1',
        }),
      ).rejects.toBeInstanceOf(CurrentPasswordIncorrectException);
      expect(mocks.accountUserRepository.updatePasswordHash).not.toHaveBeenCalled();
    });

    it('newPassword === currentPassword → PasswordSameAsOldException, không gọi updatePasswordHash', async () => {
      const { service, mocks } = createService();
      vi.mocked(mocks.passwordHasher.verify).mockResolvedValue(true);

      await expect(
        service.changePassword('user-id-1', {
          currentPassword: 'SamePassword1',
          newPassword: 'SamePassword1',
        }),
      ).rejects.toBeInstanceOf(PasswordSameAsOldException);
      expect(mocks.accountUserRepository.updatePasswordHash).not.toHaveBeenCalled();
    });

    it('hợp lệ → hash mật khẩu mới rồi gọi updatePasswordHash với hash đó', async () => {
      const { service, mocks } = createService();
      vi.mocked(mocks.passwordHasher.verify).mockResolvedValue(true);

      await service.changePassword('user-id-1', {
        currentPassword: 'OldPassword1',
        newPassword: 'NewStr0ngPass1',
      });

      expect(mocks.passwordHasher.hash).toHaveBeenCalledWith('NewStr0ngPass1');
      expect(mocks.accountUserRepository.updatePasswordHash).toHaveBeenCalledWith(
        'user-id-1',
        'hashed:NewStr0ngPass1',
      );
    });
  });

  describe('deactivateAccount', () => {
    it('mật khẩu sai → CurrentPasswordIncorrectException, không mutate gì', async () => {
      const { service, mocks } = createService();
      vi.mocked(mocks.passwordHasher.verify).mockResolvedValue(false);

      await expect(
        service.deactivateAccount('user-id-1', { password: 'wrong-password' }),
      ).rejects.toBeInstanceOf(CurrentPasswordIncorrectException);
      expect(mocks.accountUserRepository.deactivate).not.toHaveBeenCalled();
      expect(mocks.sessionService.revokeAllSessionsForUser).not.toHaveBeenCalled();
    });

    it('là ADMIN cuối cùng (LastAdminPolicyService throw) → lỗi lan truyền, KHÔNG gọi revokeAllSessionsForUser', async () => {
      const { service, mocks } = createService();
      vi.mocked(mocks.passwordHasher.verify).mockResolvedValue(true);
      vi.mocked(mocks.lastAdminPolicyService.assertActionPreservesLastAdmin).mockRejectedValue(
        new LastAdminRuleViolationException(),
      );

      await expect(
        service.deactivateAccount('user-id-1', { password: 'correct-password' }),
      ).rejects.toBeInstanceOf(LastAdminRuleViolationException);
      expect(mocks.accountUserRepository.deactivate).not.toHaveBeenCalled();
      expect(mocks.sessionService.revokeAllSessionsForUser).not.toHaveBeenCalled();
    });

    it('hợp lệ → deactivate(tx, userId) rồi revokeAllSessionsForUser(userId) không có tham số tx thứ 2', async () => {
      const { service, mocks } = createService();
      vi.mocked(mocks.passwordHasher.verify).mockResolvedValue(true);

      await service.deactivateAccount('user-id-1', { password: 'correct-password' });

      expect(mocks.lastAdminPolicyService.assertActionPreservesLastAdmin).toHaveBeenCalledWith(
        FAKE_TX,
        { targetUserId: 'user-id-1', willTargetRemainActiveAdminAfterAction: false },
      );
      expect(mocks.accountUserRepository.deactivate).toHaveBeenCalledWith(FAKE_TX, 'user-id-1');
      expect(mocks.sessionService.revokeAllSessionsForUser).toHaveBeenCalledWith('user-id-1');
    });
  });
});
