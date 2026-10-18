import { Injectable } from '@nestjs/common';

import { PrismaService } from '../common/prisma/prisma.service.js';

import { UserStatusReader } from './user-status-reader.interface.js';

@Injectable()
export class PrismaUserStatusReader implements UserStatusReader {
  constructor(private readonly prisma: PrismaService) {}

  async getStatus(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { status: true },
    });
    return user?.status ?? null;
  }
}
