import type { PrismaService } from '../../../common/prisma/prisma.service.js';

import { PrismaTaskStatisticsRepository } from './prisma-task-statistics.repository.js';

const LAST_CREATED_AT = new Date('2026-11-04T09:00:00.000Z');

function createRepository(options: {
  user?: { id: string } | null;
  groups?: { status: string; _count: { _all: number } }[];
  lastCreatedAt?: Date | null;
}) {
  const prismaMocks = {
    userFindUnique: vi
      .fn()
      .mockResolvedValue(options.user === undefined ? { id: 'user-id' } : options.user),
    taskGroupBy: vi.fn().mockResolvedValue(options.groups ?? []),
    taskAggregate: vi
      .fn()
      .mockResolvedValue({ _max: { createdAt: options.lastCreatedAt ?? null } }),
    taskFindMany: vi.fn(),
    taskFindUnique: vi.fn(),
  };
  const prisma = {
    user: { findUnique: prismaMocks.userFindUnique },
    task: {
      groupBy: prismaMocks.taskGroupBy,
      aggregate: prismaMocks.taskAggregate,
      findMany: prismaMocks.taskFindMany,
      findUnique: prismaMocks.taskFindUnique,
    },
  } as unknown as PrismaService;
  return { repository: new PrismaTaskStatisticsRepository(prisma), prismaMocks };
}

describe('PrismaTaskStatisticsRepository.findUserStatistics', () => {
  it('đếm theo trạng thái, tính tổng và mốc tạo gần nhất', async () => {
    const { repository } = createRepository({
      groups: [
        { status: 'open', _count: { _all: 7 } },
        { status: 'done', _count: { _all: 5 } },
      ],
      lastCreatedAt: LAST_CREATED_AT,
    });

    await expect(repository.findUserStatistics('user-id')).resolves.toEqual({
      userId: 'user-id',
      total: 12,
      byStatus: { open: 7, done: 5 },
      lastCreatedAt: LAST_CREATED_AT,
    });
  });

  it('user chưa có task → mọi trạng thái = 0, lastCreatedAt null', async () => {
    const { repository } = createRepository({});

    await expect(repository.findUserStatistics('user-id')).resolves.toEqual({
      userId: 'user-id',
      total: 0,
      byStatus: { open: 0, done: 0 },
      lastCreatedAt: null,
    });
  });

  it('user không tồn tại → null', async () => {
    const { repository } = createRepository({ user: null });

    await expect(repository.findUserStatistics('missing-id')).resolves.toBeNull();
  });

  it('chỉ dùng truy vấn tổng hợp — không bao giờ đọc bản ghi task (title/description)', async () => {
    const { repository, prismaMocks } = createRepository({
      groups: [{ status: 'open', _count: { _all: 1 } }],
    });

    const result = await repository.findUserStatistics('user-id');

    expect(prismaMocks.taskFindMany).not.toHaveBeenCalled();
    expect(prismaMocks.taskFindUnique).not.toHaveBeenCalled();
    expect(prismaMocks.taskGroupBy).toHaveBeenCalledWith({
      by: ['status'],
      where: { userId: 'user-id' },
      _count: { _all: true },
    });
    expect(result).not.toHaveProperty('title');
    expect(result).not.toHaveProperty('description');
  });
});
