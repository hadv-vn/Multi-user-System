import { Injectable } from '@nestjs/common';

import { PrismaService } from '../common/prisma/prisma.service.js';
import type { PrismaTx } from '../common/prisma/prisma-transaction.type.js';

import {
  CreateSessionData,
  SessionRecord,
  SessionRepository,
} from './session-repository.interface.js';

@Injectable()
export class PrismaSessionRepository implements SessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(record: CreateSessionData): Promise<SessionRecord> {
    return this.prisma.session.create({ data: record });
  }

  async findById(sessionId: string): Promise<SessionRecord | null> {
    return this.prisma.session.findUnique({ where: { id: sessionId } });
  }

  async revokeById(sessionId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllActiveForUser(userId: string, tx?: PrismaTx): Promise<void> {
    const client = tx ?? this.prisma;
    await client.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async deleteExpired(now: Date): Promise<number> {
    const { count } = await this.prisma.session.deleteMany({
      where: { expiresAt: { lt: now } },
    });
    return count;
  }
}
