import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { SESSION_REPOSITORY, type SessionRepository } from './session-repository.interface.js';

/** Dọn cứng session đã hết hạn (P3-BE-01) — không ảnh hưởng revoke (soft). */
@Injectable()
export class SessionCleanupJob {
  private readonly logger = new Logger(SessionCleanupJob.name);

  constructor(@Inject(SESSION_REPOSITORY) private readonly sessionRepository: SessionRepository) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleCleanup(): Promise<void> {
    const deletedCount = await this.sessionRepository.deleteExpired(new Date());
    this.logger.log(`Đã xóa ${deletedCount} session hết hạn.`);
  }
}
