/* eslint-disable @typescript-eslint/unbound-method --
 * Xem giải thích ở task.service.spec.ts: idiom chuẩn của Vitest mocking. */
import { TaskStatisticsUserNotFoundException } from './exceptions/task-statistics-user-not-found.exception.js';
import type { UserTaskStatisticsRecord } from './repositories/task-statistics-record.interface.js';
import type { TaskStatisticsRepository } from './repositories/task-statistics-repository.interface.js';
import { TaskStatisticsService } from './task-statistics.service.js';

function createService(result: UserTaskStatisticsRecord | null) {
  const repository: TaskStatisticsRepository = {
    findUserStatistics: vi.fn().mockResolvedValue(result),
  };
  return { service: new TaskStatisticsService(repository), repository };
}

describe('TaskStatisticsService.getUserStatistics', () => {
  it('trả về số liệu của user', async () => {
    const statistics: UserTaskStatisticsRecord = {
      userId: 'user-id',
      total: 3,
      byStatus: { open: 2, done: 1 },
      lastCreatedAt: new Date('2026-11-04T00:00:00.000Z'),
    };
    const { service, repository } = createService(statistics);

    await expect(service.getUserStatistics('user-id')).resolves.toEqual(statistics);
    expect(repository.findUserStatistics).toHaveBeenCalledWith('user-id');
  });

  it('user không tồn tại → TaskStatisticsUserNotFoundException (404 USER_NOT_FOUND)', async () => {
    const { service } = createService(null);

    await expect(service.getUserStatistics('missing-id')).rejects.toBeInstanceOf(
      TaskStatisticsUserNotFoundException,
    );
  });
});
