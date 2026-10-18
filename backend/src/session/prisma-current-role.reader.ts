import { Injectable } from '@nestjs/common';

import { PrismaService } from '../common/prisma/prisma.service.js';

import { CurrentRoleReader } from './current-role-reader.interface.js';

@Injectable()
export class PrismaCurrentRoleReader implements CurrentRoleReader {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrentRoleName(userId: string): Promise<string | null> {
    const userRole = await this.prisma.userRole.findFirst({
      where: { userId },
      orderBy: { assignedAt: 'desc' },
      include: { role: true },
    });
    return userRole?.role.name ?? null;
  }
}
