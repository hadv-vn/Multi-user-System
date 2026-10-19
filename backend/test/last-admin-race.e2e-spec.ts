/**
 * P3-BE-05 (bắt buộc, HLD Phase 3 / threat-model T11) — race condition
 * "2 ADMIN cuối cùng đồng thời hạ cấp/khóa lẫn nhau" phải bị chặn đúng 1
 * lần (chỉ 1 trong 2 request thành công, hệ thống không bao giờ còn 0
 * ADMIN ACTIVE). Chỉ tái hiện được qua transaction Postgres THẬT (FOR
 * UPDATE lock của `LastAdminPolicyService`) — test này gọi trực tiếp
 * `AdminService` (không qua HTTP/CSRF) với `PrismaService` thật.
 *
 * YÊU CẦU HẠ TẦNG: cần `DATABASE_URL` trỏ tới Postgres thật đang chạy
 * (xem `backend/.env`). KHÔNG chạy được trong môi trường không có
 * Postgres reachable — chạy bằng `npm run test:e2e`.
 *
 * Cô lập dữ liệu (theo `docs/testing/test-plan-multi-user-system.md`,
 * mục yêu cầu "tách dataset riêng cho nhóm test last-admin"): mọi ADMIN
 * ACTIVE đã có sẵn trong DB bị tạm chuyển sang `LOCKED` trong lúc test
 * chạy, khôi phục lại ở `afterAll` — đảm bảo đúng tiền điều kiện "2 ADMIN
 * cuối cùng" bất kể dữ liệu nào đã tồn tại từ trước (ví dụ admin seed).
 */
import { randomUUID } from 'node:crypto';

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { AdminService } from '../src/admin/admin.service.js';
import { PrismaService } from '../src/common/prisma/prisma.service.js';
import { LastAdminRuleViolationException } from '../src/rbac/exceptions/last-admin-rule-violation.exception.js';
import { AppModule } from '../src/app.module.js';

const RACE_ITERATIONS = 20;
const ADMIN_ROLE_NAME = 'ADMIN';
const ACTIVE_STATUS = 'ACTIVE';
const LOCKED_STATUS = 'LOCKED';

async function createActiveAdmin(prisma: PrismaService, adminRoleId: number): Promise<string> {
  const user = await prisma.user.create({
    data: {
      email: `race-admin-${randomUUID()}@example.test`,
      passwordHash: 'not-used-in-this-test',
      status: ACTIVE_STATUS,
      emailVerifiedAt: new Date(),
      userRoles: { create: { roleId: adminRoleId } },
    },
  });
  return user.id;
}

async function countActiveAdmins(prisma: PrismaService, adminRoleId: number): Promise<number> {
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM user_roles ur
    JOIN users u ON u.id = ur.user_id
    WHERE ur.role_id = ${adminRoleId} AND u.status = ${ACTIVE_STATUS}
  `;
  return Number(rows[0]?.count ?? 0);
}

describe('Race condition: 2 ADMIN cuối cùng (P3-BE-05, T11)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminService: AdminService;
  let adminRoleId: number;
  let temporarilyLockedAdminIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    adminService = app.get(AdminService);

    const adminRole = await prisma.role.upsert({
      where: { name: ADMIN_ROLE_NAME },
      update: {},
      create: { name: ADMIN_ROLE_NAME, description: 'Quản trị hệ thống' },
    });
    adminRoleId = adminRole.id;

    const existingActiveAdmins = await prisma.$queryRaw<{ id: string }[]>`
      SELECT u.id FROM user_roles ur
      JOIN users u ON u.id = ur.user_id
      WHERE ur.role_id = ${adminRoleId} AND u.status = ${ACTIVE_STATUS}
    `;
    temporarilyLockedAdminIds = existingActiveAdmins.map((row) => row.id);
    if (temporarilyLockedAdminIds.length > 0) {
      await prisma.user.updateMany({
        where: { id: { in: temporarilyLockedAdminIds } },
        data: { status: LOCKED_STATUS },
      });
    }
  });

  afterAll(async () => {
    if (temporarilyLockedAdminIds.length > 0) {
      await prisma.user.updateMany({
        where: { id: { in: temporarilyLockedAdminIds } },
        data: { status: ACTIVE_STATUS },
      });
    }
    await app.close();
  });

  it(`lockUser đồng thời 2 chiều — chỉ 1 thành công, lặp ${RACE_ITERATIONS} lần`, async () => {
    for (let i = 0; i < RACE_ITERATIONS; i += 1) {
      const adminAId = await createActiveAdmin(prisma, adminRoleId);
      const adminBId = await createActiveAdmin(prisma, adminRoleId);

      const results = await Promise.allSettled([
        adminService.lockUser(adminBId, adminAId),
        adminService.lockUser(adminAId, adminBId),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(rejected[0].reason).toBeInstanceOf(LastAdminRuleViolationException);
      expect(await countActiveAdmins(prisma, adminRoleId)).toBe(1);

      await prisma.user.deleteMany({ where: { id: { in: [adminAId, adminBId] } } });
    }
  });

  it(`changeRole (hạ cấp) đồng thời 2 chiều — chỉ 1 thành công, lặp ${RACE_ITERATIONS} lần`, async () => {
    for (let i = 0; i < RACE_ITERATIONS; i += 1) {
      const adminAId = await createActiveAdmin(prisma, adminRoleId);
      const adminBId = await createActiveAdmin(prisma, adminRoleId);

      const results = await Promise.allSettled([
        adminService.changeRole(adminBId, 'USER', adminAId),
        adminService.changeRole(adminAId, 'USER', adminBId),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(rejected[0].reason).toBeInstanceOf(LastAdminRuleViolationException);
      expect(await countActiveAdmins(prisma, adminRoleId)).toBe(1);

      await prisma.user.deleteMany({ where: { id: { in: [adminAId, adminBId] } } });
    }
  });
});
