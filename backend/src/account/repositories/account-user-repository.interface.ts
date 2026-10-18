import type { PrismaTx } from '../../common/prisma/prisma-transaction.type.js';

import { AccountUserRecord } from './account-user-record.interface.js';

/**
 * Interface tối giản riêng của AccountModule (không inject UserRepository
 * của AuthModule) — đúng convention ranh giới module đã dùng ở
 * SessionModule.UserStatusReader (tránh coupling chéo giữa module nghiệp vụ).
 */
export interface AccountUserRepository {
  findById(userId: string): Promise<AccountUserRecord | null>;
  updateName(userId: string, name: string): Promise<void>;
  updatePasswordHash(userId: string, newPasswordHash: string): Promise<void>;
  /** Chạy trong transaction do AccountService mở (cùng nhịp với LastAdminPolicyService). */
  deactivate(tx: PrismaTx, userId: string): Promise<void>;
}

export const ACCOUNT_USER_REPOSITORY = Symbol('AccountUserRepository');
