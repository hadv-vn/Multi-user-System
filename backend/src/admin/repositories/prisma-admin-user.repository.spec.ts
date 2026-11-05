import type { PrismaService } from '../../common/prisma/prisma.service.js';
import { ROLE_NAME } from '../../rbac/role.constants.js';

import { PrismaAdminUserRepository } from './prisma-admin-user.repository.js';

const NOW = new Date('2026-11-05T00:00:00.000Z');
const CREATED_AT = new Date('2026-11-01T00:00:00.000Z');
const LAST_SESSION_AT = new Date('2026-11-04T09:12:00.000Z');

/** Trường TUYỆT ĐỐI không được đọc ra cho màn hình quản trị (SRS A-3). */
const FORBIDDEN_FIELDS = [
  'passwordHash',
  'emailVerificationTokens',
  'passwordResetTokens',
  'tasks',
] as const;

function createRepository(findUniqueResult: unknown) {
  const findUnique = vi.fn().mockResolvedValue(findUniqueResult);
  const prisma = { user: { findUnique } } as unknown as PrismaService;
  return { repository: new PrismaAdminUserRepository(prisma), findUnique };
}

function createPrismaUserRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-id',
    email: 'user@example.com',
    name: 'Nguyễn Văn A',
    status: 'ACTIVE',
    emailVerifiedAt: CREATED_AT,
    failedLoginAttempts: 2,
    lockedUntil: null,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    userRoles: [{ role: { name: ROLE_NAME.ADMIN } }],
    sessions: [{ createdAt: LAST_SESSION_AT }],
    _count: { sessions: 3 },
    ...overrides,
  };
}

describe('PrismaAdminUserRepository.findDetailById', () => {
  it('chỉ select trường được phép — không đọc passwordHash, token, hay task', async () => {
    const { repository, findUnique } = createRepository(createPrismaUserRow());

    await repository.findDetailById('user-id', NOW);

    const args = findUnique.mock.calls[0][0] as { select: Record<string, unknown> };
    expect(args).not.toHaveProperty('include');
    for (const field of FORBIDDEN_FIELDS) {
      expect(args.select).not.toHaveProperty(field);
    }
  });

  it('chỉ đếm phiên chưa thu hồi và chưa hết hạn tại `now`', async () => {
    const { repository, findUnique } = createRepository(createPrismaUserRow());

    await repository.findDetailById('user-id', NOW);

    const args = findUnique.mock.calls[0][0] as {
      select: { _count: { select: { sessions: { where: unknown } } } };
    };
    expect(args.select._count.select.sessions.where).toEqual({
      revokedAt: null,
      expiresAt: { gt: NOW },
    });
  });

  it('map đúng record, gồm role, số phiên và lần đăng nhập gần nhất', async () => {
    const { repository } = createRepository(createPrismaUserRow());

    await expect(repository.findDetailById('user-id', NOW)).resolves.toEqual({
      id: 'user-id',
      email: 'user@example.com',
      name: 'Nguyễn Văn A',
      role: ROLE_NAME.ADMIN,
      status: 'ACTIVE',
      emailVerifiedAt: CREATED_AT,
      failedLoginAttempts: 2,
      lockedUntil: null,
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
      activeSessionCount: 3,
      lastLoginAt: LAST_SESSION_AT,
    });
  });

  it('chưa có role / chưa từng đăng nhập → role USER, lastLoginAt null', async () => {
    const { repository } = createRepository(
      createPrismaUserRow({ userRoles: [], sessions: [], _count: { sessions: 0 } }),
    );

    const detail = await repository.findDetailById('user-id', NOW);

    expect(detail?.role).toBe(ROLE_NAME.USER);
    expect(detail?.lastLoginAt).toBeNull();
    expect(detail?.activeSessionCount).toBe(0);
  });

  it('user không tồn tại → null', async () => {
    const { repository } = createRepository(null);

    await expect(repository.findDetailById('missing-id', NOW)).resolves.toBeNull();
  });
});
