/* eslint-disable @typescript-eslint/unbound-method --
 * Rule báo sai trên idiom chuẩn của Vitest mocking: tham chiếu trực tiếp 1
 * method của object mock (vd `expect(mocks.x.method).toHaveBeenCalledWith(...)`,
 * `vi.mocked(mocks.x.method)`) để assert — các method này là `vi.fn()`
 * không dùng `this`, không có rủi ro mất ngữ cảnh `this` thật như rule giả định. */
import type { PrismaTx } from '../common/prisma/prisma-transaction.type.js';

import { LastAdminRuleViolationException } from './exceptions/last-admin-rule-violation.exception.js';
import { LastAdminPolicyService } from './last-admin-policy.service.js';
import { ROLE_NAME } from './role.constants.js';

const ADMIN_ROLE_ID = 'role-admin-id';

function createTx(activeAdminIds: string[]): PrismaTx {
  return {
    role: {
      findUniqueOrThrow: vi.fn().mockResolvedValue({ id: ADMIN_ROLE_ID, name: ROLE_NAME.ADMIN }),
    },
    $queryRaw: vi.fn().mockResolvedValue(activeAdminIds.map((id) => ({ id }))),
  } as unknown as PrismaTx;
}

describe('LastAdminPolicyService', () => {
  describe('assertActionPreservesLastAdmin', () => {
    it('target là ADMIN active cuối cùng và willTargetRemainActiveAdminAfterAction=false → LastAdminRuleViolationException', async () => {
      const service = new LastAdminPolicyService();
      const tx = createTx(['admin-1']);

      await expect(
        service.assertActionPreservesLastAdmin(tx, {
          targetUserId: 'admin-1',
          willTargetRemainActiveAdminAfterAction: false,
        }),
      ).rejects.toBeInstanceOf(LastAdminRuleViolationException);
    });

    it('còn ≥2 ADMIN active, target là 1 trong số đó, willTargetRemainActiveAdminAfterAction=false → không throw', async () => {
      const service = new LastAdminPolicyService();
      const tx = createTx(['admin-1', 'admin-2']);

      await expect(
        service.assertActionPreservesLastAdmin(tx, {
          targetUserId: 'admin-1',
          willTargetRemainActiveAdminAfterAction: false,
        }),
      ).resolves.toBeUndefined();
    });

    it('target KHÔNG phải ADMIN active hiện tại (ví dụ đang là USER) → không throw dù willTargetRemainActiveAdminAfterAction=false', async () => {
      const service = new LastAdminPolicyService();
      const tx = createTx(['admin-1']);

      await expect(
        service.assertActionPreservesLastAdmin(tx, {
          targetUserId: 'user-not-admin',
          willTargetRemainActiveAdminAfterAction: false,
        }),
      ).resolves.toBeUndefined();
    });

    it('target là ADMIN active cuối cùng nhưng willTargetRemainActiveAdminAfterAction=true → không trừ count, không throw', async () => {
      const service = new LastAdminPolicyService();
      const tx = createTx(['admin-1']);

      await expect(
        service.assertActionPreservesLastAdmin(tx, {
          targetUserId: 'admin-1',
          willTargetRemainActiveAdminAfterAction: true,
        }),
      ).resolves.toBeUndefined();
    });

    it('truy vấn role ADMIN qua tx.role.findUniqueOrThrow trước khi $queryRaw', async () => {
      const service = new LastAdminPolicyService();
      const tx = createTx(['admin-1', 'admin-2']);

      await service.assertActionPreservesLastAdmin(tx, {
        targetUserId: 'admin-1',
        willTargetRemainActiveAdminAfterAction: false,
      });

      expect(tx.role.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { name: ROLE_NAME.ADMIN },
      });
      expect(tx.$queryRaw).toHaveBeenCalled();
    });
  });
});
