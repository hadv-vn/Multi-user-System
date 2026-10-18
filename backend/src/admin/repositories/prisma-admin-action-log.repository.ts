import { Injectable } from '@nestjs/common';

import type { PrismaTx } from '../../common/prisma/prisma-transaction.type.js';

import {
  AdminActionLogRepository,
  RecordAdminActionData,
} from './admin-action-log-repository.interface.js';

@Injectable()
export class PrismaAdminActionLogRepository implements AdminActionLogRepository {
  async record(tx: PrismaTx, entry: RecordAdminActionData): Promise<void> {
    await tx.adminActionLog.create({
      data: {
        actionType: entry.actionType,
        targetUserId: entry.targetUserId,
        performedByAdminId: entry.performedByAdminId,
        previousValue: entry.previousValue,
        newValue: entry.newValue,
      },
    });
  }
}
