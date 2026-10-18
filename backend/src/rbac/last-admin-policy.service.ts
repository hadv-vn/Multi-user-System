import { Injectable } from '@nestjs/common';

import type { PrismaTx } from '../common/prisma/prisma-transaction.type.js';

import { LastAdminRuleViolationException } from './exceptions/last-admin-rule-violation.exception.js';
import { ROLE_NAME } from './role.constants.js';

const ACTIVE_USER_STATUS = 'ACTIVE';

export interface LastAdminPolicyCheckParams {
  targetUserId: string;
  /**
   * `false` cho lock/tự-vô-hiệu-hóa/hạ-cấp (hành động có thể làm mất ADMIN
   * cuối cùng). KHÔNG gọi service này cho unlock/thăng cấp.
   */
  willTargetRemainActiveAdminAfterAction: boolean;
}

/**
 * Dùng chung bởi AccountModule (tự vô hiệu hóa) và AdminModule (lock, hạ cấp
 * role) — tránh viết trùng logic đếm ADMIN ở 2 nơi (data-model "Cách enforce
 * last-admin rule", C-3).
 */
@Injectable()
export class LastAdminPolicyService {
  async assertActionPreservesLastAdmin(
    tx: PrismaTx,
    params: LastAdminPolicyCheckParams,
  ): Promise<void> {
    const adminRole = await tx.role.findUniqueOrThrow({ where: { name: ROLE_NAME.ADMIN } });

    // Khóa pessimistic toàn bộ dòng user đang ADMIN + ACTIVE — tránh race
    // condition khi 2 request đồng thời (ví dụ 2 admin cuối cùng cùng lúc
    // hạ cấp/khóa lẫn nhau) đọc cùng giá trị đếm cũ.
    const activeAdminRows = await tx.$queryRaw<{ id: string }[]>`
      SELECT u.id
      FROM user_roles ur
      JOIN users u ON u.id = ur.user_id
      WHERE ur.role_id = ${adminRole.id}
        AND u.status = ${ACTIVE_USER_STATUS}
      FOR UPDATE OF u
    `;

    const targetIsCurrentlyActiveAdmin = activeAdminRows.some(
      (row) => row.id === params.targetUserId,
    );

    let projectedCount = activeAdminRows.length;
    if (targetIsCurrentlyActiveAdmin && !params.willTargetRemainActiveAdminAfterAction) {
      projectedCount -= 1;
    }

    if (projectedCount < 1) {
      // Ném trong callback của prisma.$transaction() → Prisma tự ROLLBACK.
      throw new LastAdminRuleViolationException();
    }
  }
}
