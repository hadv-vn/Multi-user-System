import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service.js';

import { PasswordResetTokenRepository } from './password-reset-token-repository.interface.js';
import { TokenRecord } from './token-record.interface.js';

@Injectable()
export class PrismaPasswordResetTokenRepository implements PasswordResetTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await this.prisma.passwordResetToken.create({
      data: { userId, tokenHash, expiresAt },
    });
  }

  async findByTokenHash(tokenHash: string): Promise<TokenRecord | null> {
    return this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  }

  async markUsed(tokenId: bigint): Promise<void> {
    await this.prisma.passwordResetToken.update({
      where: { id: tokenId },
      data: { usedAt: new Date() },
    });
  }

  async invalidateActiveTokensForUser(userId: string): Promise<void> {
    await this.prisma.passwordResetToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });
  }
}
