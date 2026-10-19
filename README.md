# Multi-User System

Hệ thống web hỗ trợ nhiều người dùng với đăng ký/đăng nhập, quản lý phiên
(session) và phân quyền theo vai trò (RBAC). Được xây dựng theo quy trình
SDLC đầy đủ — xem [docs/](docs/) để biết yêu cầu, kiến trúc, thiết kế, bảo
mật và kế hoạch test gốc.

## Trạng thái hiện tại

- **Backend (NestJS + Prisma + PostgreSQL)**: Phase 0 (nền tảng), Phase 1
  (Auth + Session) và Phase 2 (RBAC + Account + Admin) đã hoàn thành, có
  unit test đầy đủ.
- **Frontend (Next.js)**: chưa khởi tạo.
- **Phase 3 (hardening)**: chưa bắt đầu.

Chi tiết tiến độ theo từng hạng mục: [docs/progress/progress-multi-user-system.md](docs/progress/progress-multi-user-system.md).

## Kiến trúc tổng quan

- **Monorepo** qua npm workspaces: `backend/` (đã có), `frontend/` (chưa có).
- **Backend**: NestJS (TypeScript), modular monolith, một module theo mỗi
  bounded context (`auth`, `session`, `rbac`, `account`, `admin`, `email`,
  `common`).
- **Database**: PostgreSQL qua Prisma. Session lưu phía server trong
  Postgres (không dùng JWT) — xem
  [ADR-0001](docs/architecture/adr/0001-session-management-strategy.md).
- **Email**: gửi qua SMTP (Nodemailer) sau một interface `IEmailSender`.

Xem đầy đủ tại [docs/design/hld-multi-user-system.md](docs/design/hld-multi-user-system.md).

## Yêu cầu môi trường

- Node.js 20+ và npm 10+.
- PostgreSQL 14+ đang chạy và có thể kết nối được (local, container, hoặc
  cloud DB).
- (Tùy chọn) Một SMTP sandbox để xem email xác thực/đặt lại mật khẩu khi
  phát triển, ví dụ [Mailpit](https://github.com/axllent/mailpit) hoặc
  MailDev, lắng nghe ở `localhost:1025`.

## Cài đặt & chạy nhanh

### Cách 1 — dùng script có sẵn (khuyến nghị)

**PowerShell (Windows):**

```powershell
./scripts/run-dev.ps1
```

**Bash (Git Bash / WSL / macOS / Linux):**

```bash
./scripts/run-dev.sh
```

Script sẽ tự động:

1. Tạo `backend/.env` từ `backend/.env.example` nếu chưa có (nhớ mở file
   này và điền giá trị thật — đặc biệt `DATABASE_URL` và `CSRF_SECRET`).
2. `npm install` cho toàn bộ workspace.
3. Kiểm tra kết nối PostgreSQL theo `DATABASE_URL` (chỉ cảnh báo, không tự
   cài hay khởi động Postgres thay bạn).
4. Chạy migration (`prisma migrate deploy`) và seed role `USER`/`ADMIN`.
5. Khởi động backend ở watch mode tại `http://localhost:3001`.

Tham số tùy chọn: `-SkipInstall`/`--skip-install` và
`-SkipMigrate`/`--skip-migrate` để bỏ qua bước tương ứng khi không cần
lặp lại.

### Cách 2 — chạy từng bước thủ công

```bash
# 1. Cài dependency
npm install

# 2. Tạo file env cho backend
cp backend/.env.example backend/.env
# -> mở backend/.env và điền DATABASE_URL, CSRF_SECRET, SMTP_* thật

# 3. Migration + seed
npm run db:migrate --workspace=backend
npm run db:seed --workspace=backend

# 4. Chạy backend (watch mode)
npm run start:dev --workspace=backend
```

Backend mặc định chạy ở `http://localhost:3001` (cấu hình qua `PORT` trong
`backend/.env`). Endpoint kiểm tra nhanh: `GET /health`.

## Chạy test

```bash
# Toàn bộ workspace (hiện chỉ có backend)
npm test

# Riêng backend
npm run test --workspace=backend          # unit test (vitest)
npm run test:cov --workspace=backend       # unit test + coverage
npm run test:e2e --workspace=backend       # test e2e (cần backend/.env hợp lệ)
```

## Cấu trúc thư mục chính

```
backend/        NestJS backend (API, Prisma schema & migrations)
  src/
    auth/       Đăng ký, đăng nhập, quên/đặt lại mật khẩu
    session/    Quản lý phiên đăng nhập (server-side session)
    rbac/       RolesGuard, quy tắc last-admin
    account/    Hồ sơ cá nhân, đổi mật khẩu, tự vô hiệu hóa
    admin/      Quản trị người dùng (khóa/mở khóa, đổi vai trò)
    email/      Gửi email qua SMTP
    common/     Hạ tầng chung (Prisma, CSRF, rate-limit, exception filter)
  prisma/       Schema + migration + seed
docs/            Tài liệu SDLC: requirements, architecture, design, security, testing, progress
scripts/         Script tiện ích (chạy môi trường dev)
```

## Tài liệu liên quan

- Yêu cầu: [docs/requirements/srs-multi-user-system.md](docs/requirements/srs-multi-user-system.md)
- Kiến trúc & quyết định: [docs/architecture/adr/](docs/architecture/adr/)
- Thiết kế: [docs/design/](docs/design/)
- Bảo mật (threat model): [docs/security/threat-model-multi-user-system.md](docs/security/threat-model-multi-user-system.md)
- Kế hoạch test: [docs/testing/test-plan-multi-user-system.md](docs/testing/test-plan-multi-user-system.md)
- Tiến độ: [docs/progress/progress-multi-user-system.md](docs/progress/progress-multi-user-system.md)

## Quy ước code & commit

Dự án tuân theo các nguyên tắc trong [CLAUDE.md](CLAUDE.md): OOP/SOLID,
naming convention theo ngôn ngữ, UI futuristic/glassmorphism (khi có
frontend), và [Conventional Commits](https://www.conventionalcommits.org/)
cho commit message.
