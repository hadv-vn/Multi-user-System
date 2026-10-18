import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service.js';

import { EmailVerificationTokenRepository } from './email-verification-token-repository.interface.js';
import { TokenRecord } from './token-record.interface.js';

@Injectable()
export class PrismaEmailVerificationTokenRepository implements EmailVerificationTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await this.prisma.emailVerificationToken.create({
      data: { userId, tokenHash, expiresAt },
    });
  }

  async findByTokenHash(tokenHash: string): Promise<TokenRecord | null> {
    return this.prisma.emailVerificationToken.findUnique({ where: { tokenHash } });
  }

  async markUsed(tokenId: bigint): Promise<void> {
    await this.prisma.emailVerificationToken.update({
      where: { id: tokenId },
      data: { usedAt: new Date() },
    });
  }

  async invalidateActiveTokensForUser(userId: string): Promise<void> {
    await this.prisma.emailVerificationToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });
  }
}
