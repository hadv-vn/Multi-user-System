/* eslint-disable @typescript-eslint/unbound-method --
 * Xem giải thích ở task.service.spec.ts: idiom chuẩn của Vitest mocking. */
import { TaskStatisticsUserNotFoundException } from './exceptions/task-statistics-user-not-found.exception.js';
import type { UserTaskStatisticsRecord } from './repositories/task-statistics-record.interface.js';
import type { TaskStatisticsRepository } from './repositories/task-statistics-repository.interface.js';
import { TaskStatisticsService } from './task-statistics.service.js';

function createService(result: UserTaskStatisticsRecord | null) {
  const repository: TaskStatisticsRepository = {
    findUserStatistics: vi.fn().mockResolvedValue(result),
    findOverview: vi.fn(),
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

describe('TaskStatisticsService.getOverview', () => {
  it('ghép summary/items và tính meta phân trang (totalPages = ceil)', async () => {
    const { service, repository } = createService(null);
    const summary = { total: 14, byStatus: { open: 10, done: 4 } };
    const items = [
      { userId: 'user-a', email: 'a@example.com', total: 5, byStatus: { open: 3, done: 2 } },
    ];
    vi.mocked(repository.findOverview).mockResolvedValue({ summary, items, totalItems: 41 });

    const result = await service.getOverview({ page: 2, limit: 20, email: 'a' });

    expect(repository.findOverview).toHaveBeenCalledWith({ page: 2, limit: 20, email: 'a' });
    expect(result).toEqual({
      summary,
      items,
      meta: { page: 2, limit: 20, totalItems: 41, totalPages: 3 },
    });
  });

  it('không có user nào → totalPages = 0', async () => {
    const { service, repository } = createService(null);
    vi.mocked(repository.findOverview).mockResolvedValue({
      summary: { total: 0, byStatus: { open: 0, done: 0 } },
      items: [],
      totalItems: 0,
    });

    const result = await service.getOverview({ page: 1, limit: 20 });

    expect(result.meta.totalPages).toBe(0);
  });
});
