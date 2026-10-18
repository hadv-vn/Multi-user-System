import type { PrismaTx } from '../../common/prisma/prisma-transaction.type.js';

export const ADMIN_ACTION_TYPE = {
  LOCK: 'LOCK',
  UNLOCK: 'UNLOCK',
  ROLE_CHANGE: 'ROLE_CHANGE',
} as const;

export type AdminActionType = (typeof ADMIN_ACTION_TYPE)[keyof typeof ADMIN_ACTION_TYPE];

export interface RecordAdminActionData {
  actionType: AdminActionType;
  targetUserId: string;
  /** LUÔN lấy từ authContext.userId của request — KHÔNG BAO GIỜ nhận từ body (C-15). */
  performedByAdminId: string;
  previousValue?: string;
  newValue?: string;
}

/** Actor-tracking tối giản, append-only (C-15/T9) — xem data-model "admin_action_log". */
export interface AdminActionLogRepository {
  record(tx: PrismaTx, entry: RecordAdminActionData): Promise<void>;
}

export const ADMIN_ACTION_LOG_REPOSITORY = Symbol('AdminActionLogRepository');
