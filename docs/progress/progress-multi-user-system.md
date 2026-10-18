---
progress_tracker: true
source: docs/design/hld-multi-user-system.md (mục "Phase breakdown (input cho low-level-designer)")
last_updated: 2026-10-18
---

# Theo dõi tiến độ: Multi-User System (Auth/RBAC)

> Quy ước mã hạng mục: `hld-multi-user-system.md` mô tả Phase breakdown bằng
> danh sách thành phần (prose bullet), không có mã số sẵn. File này tự gán
> mã `P<phase>-BE-xx` (Backend) / `P<phase>-FE-xx` (Frontend) để tiện tham
> chiếu qua các lần cập nhật sau — mã này KHÔNG nằm trong tài liệu gốc, chỉ
> là tiện ích theo dõi, không làm thay đổi nội dung/cấu trúc gốc. Mỗi Phase
> được tách riêng Backend vs Frontend vì 2 track đang lệch tiến độ rất xa
> (Backend NestJS đã code nhiều, Frontend Next.js chưa khởi tạo thư mục).

Ký hiệu: `[x]` Hoàn thành · `[~]` Đang làm · `[ ]` Chưa bắt đầu.
Quy tắc tính %: chỉ hạng mục `[x]` Hoàn thành được tính vào %; hạng mục
`[~]` Đang làm liệt kê riêng, không cộng vào % hoàn thành để tránh hiểu nhầm
là đã xong.

## Thống kê tổng quan

- Tổng số hạng mục (Backend + Frontend, cả 4 phase): 50
- Hoàn thành: 23 (46.0%)
- Đang làm: 0 (0.0%)
- Chưa bắt đầu: 27 (54.0%)

### Theo track
- Backend: 23/38 hoàn thành (60.5%)
- Frontend: 0/12 hoàn thành (0.0%) — toàn bộ Frontend/Next.js chưa khởi
  tạo, kể cả thư mục `frontend/` (chỉ được khai báo tên workspace trong
  `package.json` gốc, chưa có nội dung nào).

## Thống kê theo Phase

| Phase | Backend: HT/Tổng | Backend % | Frontend: HT/Tổng | Frontend % | Tổng hợp HT/Tổng | Tổng hợp % |
|---|---|---|---|---|---|---|
| Phase 0 — Nền tảng | 9/9 | 100.0% | 0/2 | 0.0% | 9/11 | 81.8% |
| Phase 1 — Auth + Session | 14/14 | 100.0% | 0/6 | 0.0% | 14/20 | 70.0% |
| Phase 2 — RBAC + Account + Admin | 0/10 | 0.0% | 0/3 | 0.0% | 0/13 | 0.0% |
| Phase 3 — Hardening + UI polish | 0/5 | 0.0% | 0/1 | 0.0% | 0/6 | 0.0% |

## Checklist chi tiết

### Phase 0: Nền tảng (Foundation)

#### Backend
- [x] P0-BE-01 Monorepo setup phần `backend/` + npm workspaces (root
  `package.json` khai báo workspace `backend`, `backend/` có
  `package.json`/`nest-cli.json`/`tsconfig*.json` hoạt động) — Hoàn thành
  (cập nhật: 2026-10-18)
- [x] P0-BE-02 CommonModule: `PrismaService` (`backend/src/common/prisma/prisma.service.ts`,
  `prisma.module.ts`) — Hoàn thành (cập nhật: 2026-10-18)
- [x] P0-BE-03 CommonModule: global exception filter + response envelope
  (`backend/src/common/filters/all-exceptions.filter.ts`,
  `exceptions/app.exception.ts`, `exceptions/error-detail-item.interface.ts`)
  — Hoàn thành (cập nhật: 2026-10-18)
- [x] P0-BE-04 CommonModule: config module (.env) (`backend/src/common/config/environment-variables.ts`,
  `validate-environment.ts`, `backend/.env.example`, `backend/.env`) — Hoàn
  thành (cập nhật: 2026-10-18)
- [x] P0-BE-05 CommonModule: password-hashing utility (`backend/src/common/security/password-hasher.interface.ts`,
  `bcrypt-password-hasher.service.ts` + spec) — Hoàn thành (cập nhật:
  2026-10-18)
- [x] P0-BE-06 CommonModule: interface rate-limit counter + implementation
  in-memory (`backend/src/common/rate-limit/rate-limiter.interface.ts`,
  `in-memory-rate-limiter.service.ts` + spec) — Hoàn thành (cập nhật:
  2026-10-18)
- [x] P0-BE-07 `schema.prisma` khởi tạo đủ 6 bảng (users, roles, user_roles,
  sessions, email_verification_tokens, password_reset_tokens, đã có cột
  `role_snapshot` trong `sessions` theo yêu cầu C-11) + migration đầu
  (`backend/prisma/migrations/20261018000000_init/`) + seed roles USER/ADMIN
  (`backend/prisma/seed.ts`) — Hoàn thành (cập nhật: 2026-10-18)
- [x] P0-BE-08 EmailModule: định nghĩa interface `IEmailSender`
  (`backend/src/email/email-sender.interface.ts`) — Hoàn thành (cập nhật:
  2026-10-18)
- [x] P0-BE-09 ESLint/Prettier theo Google Style Guide cho Backend
  (`backend/eslint.config.mjs`, Prettier chung ở `.prettierrc.json` gốc) —
  Hoàn thành (cập nhật: 2026-10-18)

#### Frontend
- [ ] P0-FE-01 Next.js scaffold (thư mục `frontend/` chưa tồn tại — `Glob
  frontend/**/*` không có kết quả) — Chưa bắt đầu
- [ ] P0-FE-02 Tailwind config theo bảng "Nguyên tắc thị giác dùng chung"
  (`ui-wireframes-multi-user-system.md`) — Chưa bắt đầu (phụ thuộc P0-FE-01)

### Phase 1: Auth + Session

#### Backend
- [x] P1-BE-01 SessionModule: `ISessionRepository` + `PrismaSessionRepository`
  (`backend/src/session/session-repository.interface.ts`,
  `prisma-session.repository.ts`) — Hoàn thành (cập nhật: 2026-10-18)
- [x] P1-BE-02 SessionModule: `SessionService` (`backend/src/session/session.service.ts`
  + spec) — Hoàn thành (cập nhật: 2026-10-18)
- [x] P1-BE-03 SessionModule: `AuthGuard` (`backend/src/session/guards/auth.guard.ts`
  + spec) — Hoàn thành (cập nhật: 2026-10-18)
- [x] P1-BE-04 EmailModule: implementation thật `NodemailerSmtpSender`
  (`backend/src/email/nodemailer-smtp.sender.ts` + spec) — Hoàn thành (cập
  nhật: 2026-10-18)
- [x] P1-BE-05 AuthModule: `register` (`POST /api/v1/auth/register`) — Hoàn
  thành (cập nhật: 2026-10-18)
- [x] P1-BE-06 AuthModule: `verify-email` (`GET /api/v1/auth/verify-email`)
  — Hoàn thành (cập nhật: 2026-10-18)
- [x] P1-BE-07 AuthModule: `resend-verification`
  (`POST /api/v1/auth/resend-verification`) — Hoàn thành (cập nhật:
  2026-10-18)
- [x] P1-BE-08 AuthModule: `login` theo đúng thứ tự kiểm tra 1.7.1 của
  api-spec (`POST /api/v1/auth/login`) — Hoàn thành (cập nhật: 2026-10-18)
- [x] P1-BE-09 AuthModule: `forgot-password`
  (`POST /api/v1/auth/forgot-password`) — Hoàn thành (cập nhật: 2026-10-18)
- [x] P1-BE-10 AuthModule: `reset-password`
  (`POST /api/v1/auth/reset-password`) — Hoàn thành (cập nhật: 2026-10-18)
- [x] P1-BE-11 AuthModule: `logout` (`POST /api/v1/auth/logout`, có
  `AuthGuard`) — Hoàn thành (cập nhật: 2026-10-18)
- [x] P1-BE-12 Rate-limit brute-force login theo account (C-5) — account
  lockout qua `User.failedLoginAttempts`/`lockedUntil` +
  `account-temporarily-locked.exception.ts`/`account-locked.exception.ts`
  — Hoàn thành (cập nhật: 2026-10-18)
- [x] P1-BE-13 Rate-limit spam đăng ký theo IP (C-6) — `REGISTER_RATE_LIMIT`
  trong `backend/src/auth/rate-limit-policies.ts` — Hoàn thành (cập nhật:
  2026-10-18)
- [x] P1-BE-14 Rate-limit IP cho 5 endpoint nhạy cảm (C-13: login,
  verify-email, resend-verification, forgot-password, reset-password) —
  đủ 5 policy tương ứng trong `rate-limit-policies.ts` — Hoàn thành (cập
  nhật: 2026-10-18)

#### Frontend
- [ ] P1-FE-01 S1 (màn hình theo `ui-wireframes-multi-user-system.md`) —
  Chưa bắt đầu
- [ ] P1-FE-02 S2 — Chưa bắt đầu
- [ ] P1-FE-03 S3 — Chưa bắt đầu
- [ ] P1-FE-04 S4 — Chưa bắt đầu
- [ ] P1-FE-05 S5 — Chưa bắt đầu
- [ ] P1-FE-06 S6 — Chưa bắt đầu

> Ghi chú: chưa đối chiếu S1–S6 với tên màn hình cụ thể trong
> `ui-wireframes-multi-user-system.md` vì toàn bộ đều Chưa bắt đầu (không
> cần định danh chi tiết cho tới khi có tiến độ thật để tránh suy đoán).

### Phase 2: RBAC + Account + Admin

#### Backend
- [ ] P2-BE-01 RbacModule: `RolesGuard` + decorator `@Roles` — Chưa bắt đầu
  (không tìm thấy `RbacModule`/`RolesGuard`/`@Roles` trong `backend/src/`)
- [ ] P2-BE-02 RbacModule: `LastAdminPolicyService`
  (`SELECT ... FOR UPDATE`) — Chưa bắt đầu
- [ ] P2-BE-03 AccountModule: xem/sửa hồ sơ cá nhân (`name`) — Chưa bắt đầu
  (không tìm thấy `AccountModule`)
- [ ] P2-BE-04 AccountModule: đổi mật khẩu — Chưa bắt đầu
- [ ] P2-BE-05 AccountModule: tự vô hiệu hóa (gọi
  `LastAdminPolicyService` + `SessionModule` revoke) — Chưa bắt đầu
- [ ] P2-BE-06 AdminModule: danh sách/tìm kiếm người dùng — Chưa bắt đầu
  (không tìm thấy `AdminModule`)
- [ ] P2-BE-07 AdminModule: khóa/mở khóa (transaction + revoke session) —
  Chưa bắt đầu
- [ ] P2-BE-08 AdminModule: đổi role (transaction + `LastAdminPolicyService`,
  kèm revoke session khi hạ cấp ADMIN theo C-12) — Chưa bắt đầu
- [ ] P2-BE-09 CSRF protection (C-14) cho route state-changing của
  AdminModule/AccountModule — Chưa bắt đầu
- [ ] P2-BE-10 Actor-tracking (C-15: `performed_by_admin_id` + timestamp)
  — Chưa bắt đầu

#### Frontend
- [ ] P2-FE-01 S7 (hồ sơ cá nhân) — Chưa bắt đầu
- [ ] P2-FE-02 S8 (quản trị) — Chưa bắt đầu
- [ ] P2-FE-03 S9 (shell layout theo role) — Chưa bắt đầu

### Phase 3: Hardening + UI polish

> Phụ thuộc: HLD yêu cầu Phase 1 + Phase 2 phải hoàn chỉnh về chức năng
> trước khi hardening. Phase 2 hiện Chưa bắt đầu (0%) nên toàn bộ Phase 3
> dưới đây hợp lý là Chưa bắt đầu.

#### Backend / Hạ tầng
- [ ] P3-BE-01 Job dọn session hết hạn định kỳ (dựa trên index
  `sessions.expires_at`) — Chưa bắt đầu
- [ ] P3-BE-02 CAPTCHA nâng cao rate-limit (nếu threat-model review Phase 3
  thấy cần) — Chưa bắt đầu
- [ ] P3-BE-03 Rate-limit nhẹ theo phiên Admin cho lock/unlock (T10) — Chưa
  bắt đầu
- [ ] P3-BE-04 DB trigger phòng hộ bổ sung cho last-admin rule (tùy chọn,
  T11) — Chưa bắt đầu
- [ ] P3-BE-05 Test tích hợp race-condition last-admin (2 ADMIN cuối cùng
  đồng thời hạ cấp/khóa lẫn nhau — bắt buộc, không phải tùy chọn) — Chưa
  bắt đầu

#### Frontend
- [ ] P3-FE-01 Hoàn thiện UI theo đầy đủ checklist accessibility + nguyên
  tắc thị giác futuristic (`ui-wireframes-multi-user-system.md`) — Chưa
  bắt đầu
