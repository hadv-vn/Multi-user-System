import { randomBytes } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';

import type { PrismaTx } from '../common/prisma/prisma-transaction.type.js';
import { AuthenticatedUserContext } from '../types/authenticated-user-context.interface.js';

import { CURRENT_ROLE_READER, type CurrentRoleReader } from './current-role-reader.interface.js';
import { UnauthenticatedException } from './exceptions/unauthenticated.exception.js';
import {
  SESSION_REPOSITORY,
  type SessionRecord,
  type SessionRepository,
} from './session-repository.interface.js';
import { USER_STATUS_READER, type UserStatusReader } from './user-status-reader.interface.js';

const SESSION_ID_BYTE_LENGTH = 32;
const SESSION_TTL_DAYS = 7;
const ACTIVE_USER_STATUS = 'ACTIVE';

@Injectable()
export class SessionService {
  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessionRepository: SessionRepository,
    @Inject(CURRENT_ROLE_READER) private readonly currentRoleReader: CurrentRoleReader,
    @Inject(USER_STATUS_READER) private readonly userStatusReader: UserStatusReader,
  ) {}

  async createSession(userId: string): Promise<SessionRecord> {
    // Đọc role HIỆN TẠI tại đúng thời điểm này — KHÔNG dùng giá trị đã cache
    // ở bất kỳ nơi nào khác (C-11/C-12).
    const currentRoleName = await this.currentRoleReader.getCurrentRoleName(userId);
    if (currentRoleName === null) {
      throw new Error(`Vi phạm bất biến hệ thống: user ${userId} không có role nào được gán.`);
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

    return this.sessionRepository.create({
      id: randomBytes(SESSION_ID_BYTE_LENGTH).toString('base64url'),
      userId,
      roleSnapshot: currentRoleName,
      expiresAt,
    });
  }

  async getActiveSessionContext(sessionId: string): Promise<AuthenticatedUserContext> {
    const session = await this.sessionRepository.findById(sessionId);
    if (session === null) {
      throw new UnauthenticatedException();
    }
    if (session.revokedAt !== null) {
      throw new UnauthenticatedException();
    }
    if (session.expiresAt.getTime() <= Date.now()) {
      throw new UnauthenticatedException();
    }

    const userStatus = await this.userStatusReader.getStatus(session.userId);
    if (userStatus === null || userStatus !== ACTIVE_USER_STATUS) {
      throw new UnauthenticatedException();
    }

    return {
      userId: session.userId,
      role: session.roleSnapshot,
      sessionId: session.id,
    };
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.sessionRepository.revokeById(sessionId);
  }

  async revokeAllSessionsForUser(userId: string, tx?: PrismaTx): Promise<void> {
    await this.sessionRepository.revokeAllActiveForUser(userId, tx);
  }
}
