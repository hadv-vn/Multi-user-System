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

describe('PrismaTaskStatisticsRepository.findOverview', () => {
  const USERS = [
    { id: 'user-a', email: 'a@example.com' },
    { id: 'user-b', email: 'b@example.com' },
  ];

  function createOverviewRepository(options: { users?: typeof USERS; totalUsers?: number } = {}) {
    const users = options.users ?? USERS;
    const taskGroupBy = vi
      .fn()
      // Lần 1: tổng hợp toàn hệ thống (by: ['status']).
      .mockResolvedValueOnce([
        { status: 'open', _count: { _all: 10 } },
        { status: 'done', _count: { _all: 4 } },
      ])
      // Lần 2: theo user của trang hiện tại (by: ['userId', 'status']).
      .mockResolvedValueOnce([
        { userId: 'user-a', status: 'open', _count: { _all: 3 } },
        { userId: 'user-a', status: 'done', _count: { _all: 2 } },
      ]);
    const userFindMany = vi.fn().mockResolvedValue(users);
    const userCount = vi.fn().mockResolvedValue(options.totalUsers ?? users.length);
    const taskFindMany = vi.fn();
    const prisma = {
      user: { findMany: userFindMany, count: userCount },
      task: { groupBy: taskGroupBy, findMany: taskFindMany },
    } as unknown as PrismaService;
    return {
      repository: new PrismaTaskStatisticsRepository(prisma),
      taskGroupBy,
      userFindMany,
      userCount,
      taskFindMany,
    };
  }

  it('trả về tổng toàn hệ thống và số liệu từng user (user chưa có task = 0)', async () => {
    const { repository } = createOverviewRepository();

    await expect(repository.findOverview({ page: 1, limit: 20 })).resolves.toEqual({
      summary: { total: 14, byStatus: { open: 10, done: 4 } },
      items: [
        { userId: 'user-a', email: 'a@example.com', total: 5, byStatus: { open: 3, done: 2 } },
        { userId: 'user-b', email: 'b@example.com', total: 0, byStatus: { open: 0, done: 0 } },
      ],
      totalItems: 2,
    });
  });

  it('phân trang, lọc email không phân biệt hoa thường, sắp theo số task giảm dần', async () => {
    const { repository, userFindMany, userCount, taskGroupBy } = createOverviewRepository();

    await repository.findOverview({ page: 3, limit: 10, email: 'Ex' });

    const expectedWhere = { email: { contains: 'Ex', mode: 'insensitive' } };
    expect(userCount).toHaveBeenCalledWith({ where: expectedWhere });
    expect(userFindMany).toHaveBeenCalledWith({
      where: expectedWhere,
      skip: 20,
      take: 10,
      orderBy: [{ tasks: { _count: 'desc' } }, { email: 'asc' }],
      select: { id: true, email: true },
    });
    expect(taskGroupBy).toHaveBeenNthCalledWith(2, {
      by: ['userId', 'status'],
      where: { userId: { in: ['user-a', 'user-b'] } },
      _count: { _all: true },
    });
  });

  it('trang rỗng → không truy vấn số liệu theo user', async () => {
    const { repository, taskGroupBy } = createOverviewRepository({ users: [], totalUsers: 0 });

    const result = await repository.findOverview({ page: 5, limit: 20 });

    expect(result.items).toEqual([]);
    expect(taskGroupBy).toHaveBeenCalledTimes(1);
  });

  it('không bao giờ đọc bản ghi task, chỉ select id/email của user', async () => {
    const { repository, taskFindMany, userFindMany } = createOverviewRepository();

    await repository.findOverview({ page: 1, limit: 20 });

    expect(taskFindMany).not.toHaveBeenCalled();
    const args = userFindMany.mock.calls[0][0] as { select: Record<string, unknown> };
    expect(Object.keys(args.select)).toEqual(['id', 'email']);
  });
});
