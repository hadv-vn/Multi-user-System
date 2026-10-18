import type { PrismaTx } from '../../common/prisma/prisma-transaction.type.js';
import type { RoleName } from '../../rbac/role.constants.js';

import {
  AdminTargetUserRecord,
  ListUsersFilter,
  ListUsersResult,
} from './admin-user-record.interface.js';

/**
 * Interface tối giản riêng của AdminModule (không inject UserRepository của
 * AuthModule) — cùng lý do ranh giới module đã áp dụng ở AccountModule.
 */
export interface AdminUserRepository {
  findManyWithFilters(params: ListUsersFilter): Promise<ListUsersResult>;
  /** Đọc TRONG transaction, ngay trước bước mutate — tránh đọc "stale" ngoài transaction. */
  findTargetForModeration(tx: PrismaTx, userId: string): Promise<AdminTargetUserRecord | null>;
  updateStatus(tx: PrismaTx, userId: string, newStatus: string): Promise<void>;
  changeUserRole(tx: PrismaTx, userId: string, newRoleName: RoleName): Promise<void>;
}

export const ADMIN_USER_REPOSITORY = Symbol('AdminUserRepository');
