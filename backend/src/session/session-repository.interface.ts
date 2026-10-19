import type { PrismaTx } from '../common/prisma/prisma-transaction.type.js';

export interface SessionRecord {
  id: string;
  userId: string;
  roleSnapshot: string;
  createdAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
}

export interface CreateSessionData {
  id: string;
  userId: string;
  roleSnapshot: string;
  expiresAt: Date;
}

export interface SessionRepository {
  create(record: CreateSessionData): Promise<SessionRecord>;
  findById(sessionId: string): Promise<SessionRecord | null>;
  revokeById(sessionId: string): Promise<void>;
  /**
   * `tx` optional — khi truyền vào (Account/AdminModule, Phase 2), revoke
   * chạy TRONG transaction của caller để đảm bảo atomicity (ADR-0001/C-12).
   * Khi không truyền (AuthModule.resetPassword, Phase 1), hành vi giữ nguyên
   * như trước — dùng PrismaService singleton của SessionModule.
   */
  revokeAllActiveForUser(userId: string, tx?: PrismaTx): Promise<void>;
  /** Xóa cứng mọi session đã hết hạn (P3-BE-01) — dọn bảng, không phải thu hồi. */
  deleteExpired(now: Date): Promise<number>;
}

export const SESSION_REPOSITORY = Symbol('SessionRepository');
