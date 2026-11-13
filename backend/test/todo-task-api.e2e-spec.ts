/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment --
   supertest types `res.body` and Nest's `getHttpServer()` as `any`; this e2e file asserts on raw
   JSON response envelopes, so typing every body would add noise without safety. */
/**
 * E2E cho Task API của ToDo (`api/v1/tasks`) và thống kê task cho ADMIN
 * (`api/v1/admin/task-stats`, `api/v1/admin/users/:id/task-stats`).
 *
 * Mọi request đi qua HTTP thật với pipeline đầy đủ: cookie-parser,
 * ValidationPipe (cấu hình giống `main.ts`), AuthGuard (session trong DB),
 * CsrfGuard (double-submit cookie), RolesGuard, AllExceptionsFilter.
 *
 * YÊU CẦU HẠ TẦNG: cần `DATABASE_URL` trỏ tới Postgres thật đã migrate
 * (xem `backend/.env`) — chạy bằng `npm run test:e2e`.
 *
 * Cô lập dữ liệu: mỗi lần chạy tạo user riêng với email chứa `RUN_ID` ngẫu
 * nhiên, xoá ở `afterAll` (task/session bị xoá theo nhờ `onDelete: Cascade`).
 * Phần lớn session được tạo trực tiếp qua `SessionService` để không đụng
 * rate-limit login theo IP; riêng 1 test đi qua `POST /auth/login` thật.
 */
import { randomUUID } from 'node:crypto';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { AppModule } from '../src/app.module.js';
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '../src/common/csrf/csrf.constants.js';
import { PrismaService } from '../src/common/prisma/prisma.service.js';
import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from '../src/common/security/password-hasher.interface.js';
import { ROLE_NAME, type RoleName } from '../src/rbac/role.constants.js';
import { SessionService } from '../src/session/session.service.js';

const RUN_ID = randomUUID().slice(0, 8);
const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME ?? 'sid';
const TASKS = '/api/v1/tasks';

interface Client {
  userId: string;
  email: string;
  sessionId: string;
  csrfToken: string;
}

type HttpMethod = 'get' | 'post' | 'put' | 'delete';

/** Lấy giá trị 1 cookie từ header `Set-Cookie` của response. */
function readSetCookie(res: request.Response, name: string): string | undefined {
  const raw = res.headers['set-cookie'] as unknown;
  const cookies = Array.isArray(raw) ? (raw as string[]) : typeof raw === 'string' ? [raw] : [];
  const match = cookies.find((c) => c.startsWith(`${name}=`));
  return match?.split(';')[0].slice(name.length + 1);
}

describe('ToDo Task API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let sessionService: SessionService;
  const createdUserIds: string[] = [];

  let alice: Client;
  let bob: Client;
  let admin: Client;

  async function createUser(
    label: string,
    role: RoleName,
    passwordHash = 'not-used-in-this-test',
  ): Promise<{ id: string; email: string }> {
    const roleRow = await prisma.role.upsert({
      where: { name: role },
      update: {},
      create: { name: role },
    });
    const email = `e2e-task-${RUN_ID}-${label}@example.com`;
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
        userRoles: { create: { roleId: roleRow.id } },
      },
    });
    createdUserIds.push(user.id);
    return { id: user.id, email };
  }

  /** Lấy CSRF token đúng như client thật: từ cookie server set trên 1 GET đã đăng nhập. */
  async function fetchCsrfToken(sessionId: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .get(TASKS)
      .set('Cookie', `${SESSION_COOKIE}=${sessionId}`)
      .expect(200);
    const token = readSetCookie(res, CSRF_COOKIE_NAME);
    if (!token) throw new Error('Server không set cookie CSRF trên GET đã đăng nhập.');
    return token;
  }

  async function createClient(label: string, role: RoleName): Promise<Client> {
    const { id, email } = await createUser(label, role);
    const session = await sessionService.createSession(id);
    const csrfToken = await fetchCsrfToken(session.id);
    return { userId: id, email, sessionId: session.id, csrfToken };
  }

  /** Request đã đăng nhập, kèm cookie session + CSRF (cookie và header). */
  function as(client: Client, method: HttpMethod, path: string): request.Test {
    return request(app.getHttpServer())
      [method](path)
      .set(
        'Cookie',
        `${SESSION_COOKIE}=${client.sessionId}; ${CSRF_COOKIE_NAME}=${client.csrfToken}`,
      )
      .set(CSRF_HEADER_NAME, client.csrfToken);
  }

  async function createTask(
    client: Client,
    body: { title: string; description?: string },
  ): Promise<{ id: string; status: string }> {
    const res = await as(client, 'post', TASKS).send(body).expect(201);
    return res.body.data as { id: string; status: string };
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    sessionService = app.get(SessionService);

    alice = await createClient('alice', ROLE_NAME.USER);
    bob = await createClient('bob', ROLE_NAME.USER);
    admin = await createClient('admin', ROLE_NAME.ADMIN);
  });

  afterAll(async () => {
    if (prisma && createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    await app?.close();
  });

  describe('Xác thực & CSRF', () => {
    it('không có session → 401 UNAUTHENTICATED', async () => {
      const res = await request(app.getHttpServer()).get(TASKS).expect(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('session không tồn tại → 401 UNAUTHENTICATED', async () => {
      const res = await request(app.getHttpServer())
        .get(TASKS)
        .set('Cookie', `${SESSION_COOKIE}=does-not-exist`)
        .expect(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('session đã bị revoke (đăng xuất) → 401', async () => {
      const client = await createClient('revoked', ROLE_NAME.USER);
      await as(client, 'post', '/api/v1/auth/logout').expect(200);
      await as(client, 'get', TASKS).expect(401);
    });

    it('POST thiếu CSRF header → 403 CSRF_TOKEN_INVALID, không tạo task', async () => {
      const res = await request(app.getHttpServer())
        .post(TASKS)
        .set(
          'Cookie',
          `${SESSION_COOKIE}=${alice.sessionId}; ${CSRF_COOKIE_NAME}=${alice.csrfToken}`,
        )
        .send({ title: 'no-csrf' })
        .expect(403);
      expect(res.body.error.code).toBe('CSRF_TOKEN_INVALID');
      expect(await prisma.task.count({ where: { userId: alice.userId, title: 'no-csrf' } })).toBe(
        0,
      );
    });

    it('CSRF token của session khác → 403 CSRF_TOKEN_INVALID', async () => {
      const res = await request(app.getHttpServer())
        .post(TASKS)
        .set('Cookie', `${SESSION_COOKIE}=${alice.sessionId}; ${CSRF_COOKIE_NAME}=${bob.csrfToken}`)
        .set(CSRF_HEADER_NAME, bob.csrfToken)
        .send({ title: 'wrong-csrf' })
        .expect(403);
      expect(res.body.error.code).toBe('CSRF_TOKEN_INVALID');
    });

    it('GET không cần CSRF header', async () => {
      await request(app.getHttpServer())
        .get(TASKS)
        .set('Cookie', `${SESSION_COOKIE}=${alice.sessionId}`)
        .expect(200);
    });

    it('luồng đầy đủ qua POST /auth/login thật → tạo được task', async () => {
      const password = 'Passw0rd-e2e';
      const hasher = app.get<PasswordHasher>(PASSWORD_HASHER);
      const { email } = await createUser('login', ROLE_NAME.USER, await hasher.hash(password));

      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password })
        .expect(200);
      const sessionId = readSetCookie(loginRes, SESSION_COOKIE);
      expect(sessionId).toBeTruthy();

      const csrfToken = await fetchCsrfToken(sessionId!);
      const res = await request(app.getHttpServer())
        .post(TASKS)
        .set('Cookie', `${SESSION_COOKIE}=${sessionId}; ${CSRF_COOKIE_NAME}=${csrfToken}`)
        .set(CSRF_HEADER_NAME, csrfToken)
        .send({ title: 'via real login' })
        .expect(201);
      expect(res.body.data.title).toBe('via real login');
    });
  });

  describe('POST /api/v1/tasks', () => {
    it('201 — trả task mới, status mặc định open, description null, không lộ userId', async () => {
      const res = await as(alice, 'post', TASKS).send({ title: 'Mua sữa' }).expect(201);
      const task = res.body.data;
      expect(task).toMatchObject({ title: 'Mua sữa', description: null, status: 'open' });
      expect(task.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(task.createdAt).toEqual(expect.any(String));
      expect(task.updatedAt).toEqual(expect.any(String));
      expect(task).not.toHaveProperty('userId');

      const row = await prisma.task.findUnique({ where: { id: task.id } });
      expect(row?.userId).toBe(alice.userId);
    });

    it('201 — lưu description khi có gửi', async () => {
      const res = await as(alice, 'post', TASKS)
        .send({ title: 'Có mô tả', description: 'chi tiết' })
        .expect(201);
      expect(res.body.data.description).toBe('chi tiết');
    });

    it('400 VALIDATION_ERROR — field lạ (userId) bị từ chối', async () => {
      const res = await as(alice, 'post', TASKS)
        .send({ title: 'x', userId: bob.userId })
        .expect(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it.each([
      ['thiếu title', {}],
      ['title rỗng', { title: '' }],
      ['title không phải string', { title: 123 }],
      ['title dài 256 ký tự', { title: 'a'.repeat(256) }],
      ['description không phải string', { title: 'ok', description: 5 }],
    ])('400 VALIDATION_ERROR — %s', async (_label, body) => {
      const res = await as(alice, 'post', TASKS).send(body).expect(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('201 — title đúng 255 ký tự', async () => {
      await as(alice, 'post', TASKS)
        .send({ title: 'a'.repeat(255) })
        .expect(201);
    });
  });

  describe('GET /api/v1/tasks', () => {
    let listUser: Client;
    let openId: string;
    let doneId: string;

    beforeAll(async () => {
      listUser = await createClient('list', ROLE_NAME.USER);
      openId = (await createTask(listUser, { title: 'open task' })).id;
      doneId = (await createTask(listUser, { title: 'done task' })).id;
      await as(listUser, 'put', `${TASKS}/${doneId}`).send({ status: 'done' }).expect(200);
      await createTask(bob, { title: 'task của bob' });
    });

    it('chỉ trả task của chính mình', async () => {
      const res = await as(listUser, 'get', TASKS).expect(200);
      const ids = (res.body.data as { id: string }[]).map((t) => t.id).sort();
      expect(ids).toEqual([openId, doneId].sort());
    });

    it('lọc status=open', async () => {
      const res = await as(listUser, 'get', `${TASKS}?status=open`).expect(200);
      expect((res.body.data as { id: string }[]).map((t) => t.id)).toEqual([openId]);
    });

    it('lọc status=done', async () => {
      const res = await as(listUser, 'get', `${TASKS}?status=done`).expect(200);
      expect((res.body.data as { id: string }[]).map((t) => t.id)).toEqual([doneId]);
    });

    it('user chưa có task → mảng rỗng', async () => {
      const empty = await createClient('empty', ROLE_NAME.USER);
      const res = await as(empty, 'get', TASKS).expect(200);
      expect(res.body.data).toEqual([]);
    });

    it('status không hợp lệ → 400 VALIDATION_ERROR', async () => {
      const res = await as(listUser, 'get', `${TASKS}?status=DONE`).expect(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/tasks/:id', () => {
    it('200 — task của mình', async () => {
      const { id } = await createTask(alice, { title: 'xem chi tiết', description: 'd' });
      const res = await as(alice, 'get', `${TASKS}/${id}`).expect(200);
      expect(res.body.data).toMatchObject({ id, title: 'xem chi tiết', description: 'd' });
    });

    it('403 TASK_FORBIDDEN — task của user khác', async () => {
      const { id } = await createTask(bob, { title: 'bí mật' });
      const res = await as(alice, 'get', `${TASKS}/${id}`).expect(403);
      expect(res.body.error.code).toBe('TASK_FORBIDDEN');
      expect(JSON.stringify(res.body)).not.toContain('bí mật');
    });

    it('404 TASK_NOT_FOUND — id không tồn tại', async () => {
      const res = await as(alice, 'get', `${TASKS}/${randomUUID()}`).expect(404);
      expect(res.body.error.code).toBe('TASK_NOT_FOUND');
    });

    it('400 VALIDATION_ERROR — id không phải UUID', async () => {
      const res = await as(alice, 'get', `${TASKS}/not-a-uuid`).expect(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/v1/tasks/:id', () => {
    it('sửa title/description, giữ nguyên status', async () => {
      const { id } = await createTask(alice, { title: 'cũ', description: 'mô tả cũ' });
      const res = await as(alice, 'put', `${TASKS}/${id}`)
        .send({ title: 'mới', description: 'mô tả mới' })
        .expect(200);
      expect(res.body.data).toMatchObject({
        id,
        title: 'mới',
        description: 'mô tả mới',
        status: 'open',
      });
    });

    it('chỉ gửi title → description giữ nguyên', async () => {
      const { id } = await createTask(alice, { title: 't', description: 'giữ lại' });
      const res = await as(alice, 'put', `${TASKS}/${id}`).send({ title: 't2' }).expect(200);
      expect(res.body.data.description).toBe('giữ lại');
    });

    it('description: null → xoá mô tả', async () => {
      const { id } = await createTask(alice, { title: 't', description: 'sẽ bị xoá' });
      const res = await as(alice, 'put', `${TASKS}/${id}`)
        .send({ title: 't', description: null })
        .expect(200);
      expect(res.body.data.description).toBeNull();
    });

    it('toggle status open → done → open, không đổi nội dung', async () => {
      const { id } = await createTask(alice, { title: 'toggle', description: 'x' });
      const done = await as(alice, 'put', `${TASKS}/${id}`).send({ status: 'done' }).expect(200);
      expect(done.body.data).toMatchObject({ status: 'done', title: 'toggle', description: 'x' });
      const open = await as(alice, 'put', `${TASKS}/${id}`).send({ status: 'open' }).expect(200);
      expect(open.body.data.status).toBe('open');
    });

    it('updatedAt tăng sau khi sửa', async () => {
      const created = await as(alice, 'post', TASKS).send({ title: 'time' }).expect(201);
      const res = await as(alice, 'put', `${TASKS}/${created.body.data.id}`)
        .send({ status: 'done' })
        .expect(200);
      expect(new Date(res.body.data.updatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(created.body.data.updatedAt).getTime(),
      );
    });

    it.each([
      ['status không hợp lệ', { status: 'closed' }],
      ['title dài 256 ký tự', { title: 'a'.repeat(256) }],
      ['field lạ', { userId: randomUUID() }],
    ])('400 VALIDATION_ERROR — %s', async (_label, body) => {
      const { id } = await createTask(alice, { title: 'invalid update' });
      const res = await as(alice, 'put', `${TASKS}/${id}`).send(body).expect(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('403 TASK_FORBIDDEN — sửa task của user khác, dữ liệu không đổi', async () => {
      const { id } = await createTask(bob, { title: 'của bob' });
      const res = await as(alice, 'put', `${TASKS}/${id}`).send({ title: 'hack' }).expect(403);
      expect(res.body.error.code).toBe('TASK_FORBIDDEN');
      const row = await prisma.task.findUnique({ where: { id } });
      expect(row?.title).toBe('của bob');
    });

    it('404 TASK_NOT_FOUND — id không tồn tại', async () => {
      const res = await as(alice, 'put', `${TASKS}/${randomUUID()}`)
        .send({ status: 'done' })
        .expect(404);
      expect(res.body.error.code).toBe('TASK_NOT_FOUND');
    });

    it('403 CSRF_TOKEN_INVALID — thiếu CSRF', async () => {
      const { id } = await createTask(alice, { title: 'csrf put' });
      await request(app.getHttpServer())
        .put(`${TASKS}/${id}`)
        .set('Cookie', `${SESSION_COOKIE}=${alice.sessionId}`)
        .send({ status: 'done' })
        .expect(403);
    });
  });

  describe('DELETE /api/v1/tasks/:id', () => {
    it('204 không body, sau đó GET → 404, xoá lần 2 → 404', async () => {
      const { id } = await createTask(alice, { title: 'xoá tôi' });
      const res = await as(alice, 'delete', `${TASKS}/${id}`).expect(204);
      expect(res.text).toBe('');
      await as(alice, 'get', `${TASKS}/${id}`).expect(404);
      const again = await as(alice, 'delete', `${TASKS}/${id}`).expect(404);
      expect(again.body.error.code).toBe('TASK_NOT_FOUND');
    });

    it('403 TASK_FORBIDDEN — xoá task của user khác, task vẫn còn', async () => {
      const { id } = await createTask(bob, { title: 'đừng xoá' });
      const res = await as(alice, 'delete', `${TASKS}/${id}`).expect(403);
      expect(res.body.error.code).toBe('TASK_FORBIDDEN');
      expect(await prisma.task.findUnique({ where: { id } })).not.toBeNull();
    });

    it('403 CSRF_TOKEN_INVALID — thiếu CSRF, task vẫn còn', async () => {
      const { id } = await createTask(alice, { title: 'csrf delete' });
      await request(app.getHttpServer())
        .delete(`${TASKS}/${id}`)
        .set('Cookie', `${SESSION_COOKIE}=${alice.sessionId}`)
        .expect(403);
      expect(await prisma.task.findUnique({ where: { id } })).not.toBeNull();
    });
  });

  describe('Thống kê task cho ADMIN', () => {
    let statsUser: Client;

    beforeAll(async () => {
      statsUser = await createClient('stats', ROLE_NAME.USER);
      await createTask(statsUser, { title: 'secret-title-1', description: 'secret-desc' });
      await createTask(statsUser, { title: 'secret-title-2' });
      const { id } = await createTask(statsUser, { title: 'secret-title-3' });
      await as(statsUser, 'put', `${TASKS}/${id}`).send({ status: 'done' }).expect(200);
    });

    it('USER gọi → 403 FORBIDDEN (cả 2 endpoint)', async () => {
      const a = await as(alice, 'get', '/api/v1/admin/task-stats').expect(403);
      expect(a.body.error.code).toBe('FORBIDDEN');
      const b = await as(alice, 'get', `/api/v1/admin/users/${statsUser.userId}/task-stats`).expect(
        403,
      );
      expect(b.body.error.code).toBe('FORBIDDEN');
    });

    it('chưa đăng nhập → 401', async () => {
      await request(app.getHttpServer()).get('/api/v1/admin/task-stats').expect(401);
    });

    it('GET users/:id/task-stats — đúng số liệu, không lộ nội dung task', async () => {
      const res = await as(
        admin,
        'get',
        `/api/v1/admin/users/${statsUser.userId}/task-stats`,
      ).expect(200);
      expect(res.body.data).toMatchObject({
        userId: statsUser.userId,
        total: 3,
        byStatus: { open: 2, done: 1 },
      });
      expect(res.body.data.lastCreatedAt).toEqual(expect.any(String));
      expect(JSON.stringify(res.body)).not.toMatch(/secret-/);
    });

    it('user chưa có task → total 0, byStatus đủ khoá = 0, lastCreatedAt null', async () => {
      const res = await as(admin, 'get', `/api/v1/admin/users/${bob.userId}/task-stats`).expect(
        200,
      );
      expect(res.body.data.byStatus).toHaveProperty('open');
      expect(res.body.data.byStatus).toHaveProperty('done');

      const empty = await createClient('stats-empty', ROLE_NAME.USER);
      const emptyRes = await as(
        admin,
        'get',
        `/api/v1/admin/users/${empty.userId}/task-stats`,
      ).expect(200);
      expect(emptyRes.body.data).toEqual({
        userId: empty.userId,
        total: 0,
        byStatus: { open: 0, done: 0 },
        lastCreatedAt: null,
      });
    });

    it('404 USER_NOT_FOUND — user không tồn tại; 400 — id không phải UUID', async () => {
      const res = await as(admin, 'get', `/api/v1/admin/users/${randomUUID()}/task-stats`).expect(
        404,
      );
      expect(res.body.error.code).toBe('USER_NOT_FOUND');
      await as(admin, 'get', '/api/v1/admin/users/abc/task-stats').expect(400);
    });

    it('GET task-stats — lọc theo email, sắp theo total giảm dần, summary toàn hệ thống', async () => {
      const res = await as(
        admin,
        'get',
        `/api/v1/admin/task-stats?email=${encodeURIComponent(`E2E-TASK-${RUN_ID}`)}&limit=100`,
      ).expect(200);

      const items = res.body.data.items as { userId: string; email: string; total: number }[];
      expect(items.every((i) => i.email.includes(RUN_ID))).toBe(true);
      const totals = items.map((i) => i.total);
      expect(totals).toEqual([...totals].sort((a, b) => b - a));

      const statsItem = items.find((i) => i.userId === statsUser.userId);
      expect(statsItem).toMatchObject({ total: 3, byStatus: { open: 2, done: 1 } });

      const summary = res.body.data.summary as { total: number; byStatus: Record<string, number> };
      expect(summary.total).toBe(await prisma.task.count());
      expect(summary.byStatus.open + summary.byStatus.done).toBe(summary.total);

      expect(res.body.meta).toMatchObject({ page: 1, limit: 100, totalItems: items.length });
      expect(JSON.stringify(res.body)).not.toMatch(/secret-/);
    });

    it('phân trang — limit=1 trả đúng 1 item và totalPages khớp', async () => {
      const res = await as(
        admin,
        'get',
        `/api/v1/admin/task-stats?email=e2e-task-${RUN_ID}&limit=1&page=2`,
      ).expect(200);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.meta.page).toBe(2);
      expect(res.body.meta.totalPages).toBe(res.body.meta.totalItems);
    });

    it.each([['limit=0'], ['limit=101'], ['page=0'], ['page=abc'], [`email=${'a'.repeat(256)}`]])(
      '400 VALIDATION_ERROR — %s',
      async (query) => {
        const res = await as(admin, 'get', `/api/v1/admin/task-stats?${query}`).expect(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
      },
    );
  });
});
