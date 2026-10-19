
---
progress_tracker: true
source: docs/design/hld-multi-user-system.md (mục "Phase breakdown (input cho low-level-designer)")
last_updated: 2026-10-19 (Frontend Phase 3 hoàn thành — toàn bộ dự án 50/50, 100%)
---

# Theo dõi tiến độ: Multi-User System (Auth/RBAC)

> Quy ước mã hạng mục: `hld-multi-user-system.md` mô tả Phase breakdown bằng
> danh sách thành phần (prose bullet), không có mã số sẵn. File này tự gán
> mã `P<phase>-BE-xx` (Backend) / `P<phase>-FE-xx` (Frontend) để tiện tham
> chiếu qua các lần cập nhật sau — mã này KHÔNG nằm trong tài liệu gốc, chỉ
> là tiện ích theo dõi, không làm thay đổi nội dung/cấu trúc gốc. Mỗi Phase
> được tách riêng Backend vs Frontend vì 2 track từng lệch tiến độ rất xa;
> Backend đã xong 100% (Phase 0–3), Frontend đã bắt kịp tới hết Phase 2,
> còn Phase 3 UI polish (tính tới 2026-10-19).

Ký hiệu: `[x]` Hoàn thành · `[~]` Đang làm · `[ ]` Chưa bắt đầu.
Quy tắc tính %: chỉ hạng mục `[x]` Hoàn thành được tính vào %; hạng mục
`[~]` Đang làm liệt kê riêng, không cộng vào % hoàn thành để tránh hiểu nhầm
là đã xong.

## Thống kê tổng quan

- Tổng số hạng mục (Backend + Frontend, cả 4 phase): 50
- Hoàn thành: 50 (100.0%)
- Đang làm: 0 (0.0%)
- Chưa bắt đầu: 0 (0.0%)

### Theo track
- Backend: 38/38 hoàn thành (100.0%) — Phase 0–3 đã code/quyết định xong.
  `P3-BE-02`/`P3-BE-04` tính là "Hoàn thành" ở nghĩa **đã ra quyết định rõ
  ràng kèm lý do** (không triển khai), không phải code mới — xem ghi chú
  tại từng mục.
- Frontend: 12/12 hoàn thành (100.0%) — Phase 0 (Next.js scaffold +
  Tailwind), Phase 1 (màn hình S1–S6), Phase 2 (S7–S9), và Phase 3 (UI
  polish, `P3-FE-01`) đã code xong (cập nhật 2026-10-19).

## Thống kê theo Phase

| Phase | Backend: HT/Tổng | Backend % | Frontend: HT/Tổng | Frontend % | Tổng hợp HT/Tổng | Tổng hợp % |
|---|---|---|---|---|---|---|
| Phase 0 — Nền tảng | 9/9 | 100.0% | 2/2 | 100.0% | 11/11 | 100.0% |
| Phase 1 — Auth + Session | 14/14 | 100.0% | 6/6 | 100.0% | 20/20 | 100.0% |
| Phase 2 — RBAC + Account + Admin | 10/10 | 100.0% | 3/3 | 100.0% | 13/13 | 100.0% |
| Phase 3 — Hardening + UI polish | 5/5 | 100.0% | 1/1 | 100.0% | 6/6 | 100.0% |

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
- [x] P0-FE-01 Next.js scaffold (App Router, TypeScript, ESLint, ký hiệu
  `frontend/src/app`, `frontend/src/lib`, `frontend/src/components`,
  `frontend/src/features`, `frontend/src/config`; `next build` +
  `tsc --noEmit` + `eslint` sạch) — Hoàn thành (cập nhật: 2026-10-19)
- [x] P0-FE-02 Tailwind v4 (CSS-first config) theo bảng "Nguyên tắc thị
  giác dùng chung" (`frontend/src/app/globals.css` — design token màu
  neon/glass, gradient nền, font Space Grotesk/Inter qua `next/font`) —
  Hoàn thành (cập nhật: 2026-10-19)

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
- [x] P1-FE-01 S1 Đăng ký (`frontend/src/app/(public)/register/page.tsx`,
  `features/auth/components/RegisterForm.tsx`) — Hoàn thành (cập nhật:
  2026-10-19; lỗi email đã tồn tại hiển thị inline theo hành vi backend
  thật — xem cập nhật 2026-10-19 trong `ui-wireframes-multi-user-system.md`
  mục S1, khác thiết kế "ẩn hoàn toàn" ban đầu)
- [x] P1-FE-02 S2 Kiểm tra email
  (`.../register/check-email/page.tsx`, `CheckEmailPanel.tsx`) — Hoàn
  thành (cập nhật: 2026-10-19)
- [x] P1-FE-03 S3 Xử lý xác thực email (`.../verify-email/page.tsx`,
  `VerifyEmailHandler.tsx`) — Hoàn thành (cập nhật: 2026-10-19)
- [x] P1-FE-04 S4 Đăng nhập (`.../login/page.tsx`, `LoginForm.tsx`) —
  Hoàn thành (cập nhật: 2026-10-19)
- [x] P1-FE-05 S5 Quên mật khẩu (`.../forgot-password/page.tsx`,
  `ForgotPasswordForm.tsx`) — Hoàn thành (cập nhật: 2026-10-19)
- [x] P1-FE-06 S6 Đặt lại mật khẩu (`.../reset-password/page.tsx`,
  `ResetPasswordForm.tsx`) — Hoàn thành (cập nhật: 2026-10-19; bỏ bước
  "kiểm tra liên kết trước khi hiện form" — không có endpoint pre-check,
  xem cập nhật 2026-10-19 trong `ui-wireframes-multi-user-system.md` mục
  S6)

> Hạ tầng dùng chung đã code cùng lúc: `lib/http` (`HttpClient`/
> `FetchHttpClient`/`ApiError`), `lib/auth/auth-api.ts` (wrapper 7 endpoint
> `/auth/*`), `lib/session` (`SessionProvider`/`useSession`),
> `src/proxy.ts` (redirect theo cookie session — đổi tên từ
> `middleware.ts` theo convention Next.js 16), `components/ui/*` +
> `components/auth/*` (component dùng chung). Thiết kế chi tiết tại
> `docs/design/lld-frontend-phase0-1.md`. Kiểm thử đã làm: `next build`,
> `tsc --noEmit`, `eslint` đều sạch; dev server chạy thử — cả 6 route trả
> `200`, `/` redirect `307` sang `/login`. **Chưa có unit test tự động**
> cho hook/component Frontend (gợi ý dùng `test-writer` ở lượt làm việc
> sau nếu cần).

### Phase 2: RBAC + Account + Admin

#### Backend
- [x] P2-BE-01 RbacModule: `RolesGuard` + decorator `@Roles`
  (`backend/src/rbac/guards/roles.guard.ts` + spec, `roles.decorator.ts`)
  — Hoàn thành (cập nhật: 2026-10-18)
- [x] P2-BE-02 RbacModule: `LastAdminPolicyService`
  (`backend/src/rbac/last-admin-policy.service.ts` + spec) — Hoàn thành
  (cập nhật: 2026-10-18)
- [x] P2-BE-03 AccountModule: xem/sửa hồ sơ cá nhân (`name`)
  (`backend/src/account/account.controller.ts`,
  `account.service.ts` + spec,
  `guards/reject-non-editable-profile-fields.guard.ts` + spec) — Hoàn
  thành (cập nhật: 2026-10-18)
- [x] P2-BE-04 AccountModule: đổi mật khẩu (`account.service.ts`
  `changePassword`, `dto/change-password.dto.ts`) — Hoàn thành (cập nhật:
  2026-10-18)
- [x] P2-BE-05 AccountModule: tự vô hiệu hóa (gọi
  `LastAdminPolicyService` + `SessionModule` revoke sau khi commit,
  `account.service.ts` `deactivateAccount`) — Hoàn thành (cập nhật:
  2026-10-18)
- [x] P2-BE-06 AdminModule: danh sách/tìm kiếm người dùng
  (`backend/src/admin/admin.controller.ts`, `admin.service.ts` + spec,
  `dto/list-users-query.dto.ts`) — Hoàn thành (cập nhật: 2026-10-18)
- [x] P2-BE-07 AdminModule: khóa/mở khóa (transaction + revoke session
  trong cùng transaction, `admin.service.ts` `lockUser`/`unlockUser`) —
  Hoàn thành (cập nhật: 2026-10-18)
- [x] P2-BE-08 AdminModule: đổi role (transaction + `LastAdminPolicyService`,
  kèm revoke session khi hạ cấp ADMIN theo C-12, `admin.service.ts`
  `changeRole`) — Hoàn thành (cập nhật: 2026-10-18)
- [x] P2-BE-09 CSRF protection (C-14) cho route state-changing của
  AdminModule/AccountModule (`backend/src/common/csrf/csrf.guard.ts` +
  spec, `csrf-token.service.ts` + spec, `csrf-cookie-issuer.interceptor.ts`;
  gắn `@UseGuards(CsrfGuard, ...)` trên mọi route POST/PATCH của
  `admin.controller.ts`/`account.controller.ts`) — Hoàn thành (cập nhật:
  2026-10-18)
- [x] P2-BE-10 Actor-tracking (C-15: actor id + timestamp qua
  `AdminActionLog`, `backend/src/admin/repositories/prisma-admin-action-log.repository.ts`,
  migration `20261018010000_add_admin_action_log`, đã được
  `db-schema-reviewer` duyệt) — Hoàn thành (cập nhật: 2026-10-18)

#### Frontend
- [x] P2-FE-01 S7 Hồ sơ cá nhân — 3 section
  (`features/account/components/{ProfileBasicInfoSection,
  ChangePasswordSection, DeactivateAccountSection,
  DeactivateConfirmDialog}.tsx`, route `app/(authenticated)/profile/page.tsx`)
  — Hoàn thành (cập nhật: 2026-10-19; field Họ tên bắt buộc 1–100 ký tự
  theo backend thật, khác wireframe gốc — xem cập nhật 2026-10-19 trong
  `ui-wireframes-multi-user-system.md` mục S7a; nút vô hiệu hóa LUÔN
  enable, lỗi last-admin chỉ hiện sau submit — xem cập nhật S7c)
- [x] P2-FE-02 S8 Quản trị người dùng
  (`features/admin/components/{AdminUsersPage, UsersSearchBox, UsersTable,
  LockUnlockConfirmDialog, ChangeRoleDialog}.tsx`, route
  `app/(authenticated)/admin/users/page.tsx`) — Hoàn thành (cập nhật:
  2026-10-19; không có cột Họ tên, thêm trạng thái `DEACTIVATED`, nút
  khóa/mở khóa/đổi vai trò LUÔN enable — xem cập nhật 2026-10-19 trong
  `ui-wireframes-multi-user-system.md` mục S8)
- [x] P2-FE-03 S9 Shell layout theo role
  (`components/shell/{AppShell, NavBar, UserMenu, Sidebar,
  ShellSkeleton}.tsx`, cắm vào `app/(authenticated)/layout.tsx`) — Hoàn
  thành (cập nhật: 2026-10-19)

> Hạ tầng dùng chung mới code cùng lúc: `lib/http` mở rộng
> (`headers?`/`meta?`, `CsrfAwareHttpClient` + `csrf-cookie-reader.ts` +
> `csrf.constants.ts`), `lib/account/account-api.ts`,
> `lib/admin/admin-api.ts`, `lib/session` mở rộng (`name`/`status`/
> `isInitializing`), `features/session/hooks/{use-session-bootstrap,
> handle-unauthenticated}.ts` (rehydrate qua `GET /account/me`,
> logout cứng khi 401 giữa lúc dùng), component dùng chung mới
> `components/ui/{DataTable, Pagination, ConfirmDialog, Checkbox,
> SelectField}.tsx`. Thiết kế chi tiết tại
> `docs/design/lld-frontend-phase2.md`. **Fix backend đi kèm (ngoài
> phạm vi Phase 2 Frontend nhưng cần để Phase 2 test được cục bộ)**:
> cookie `sid`/`csrfToken` đổi từ `secure: true` cố định sang
> `secure: IS_PRODUCTION` (`backend/src/common/config/is-production.ts`,
> sửa `auth.controller.ts` + `csrf-cookie-issuer.interceptor.ts`) — qua
> HTTP thường ở dev, browser từ chối lưu cookie `secure`, chặn hoàn toàn
> đăng nhập/CSRF cục bộ nếu không sửa; người dùng đã xác nhận hướng sửa
> này. Kiểm thử đã làm: `next build`, `tsc --noEmit`, `eslint` (cả
> frontend và backend) đều sạch; backend `vitest run` 141/141 pass; dev
> server chạy thử — `/profile`, `/admin/users` không có cookie session
> đều redirect `307` đúng về `/login?reason=session_required` qua
> `proxy.ts`. **Chưa test được luồng đăng nhập→S7/S8 thật** (cần
> Postgres, không có trong sandbox này — cùng giới hạn đã ghi ở
> P3-BE-05). **Chưa có unit test tự động** cho hook/component Phase 2
> (gợi ý dùng `test-writer`).

### Phase 3: Hardening + UI polish

> Phụ thuộc: HLD yêu cầu Phase 1 + Phase 2 phải hoàn chỉnh về chức năng
> trước khi hardening — đã thỏa (cả Backend và Frontend Phase 1+2 đều
> 100%, tính tới 2026-10-19). Backend Phase 3 đã hoàn thành/đã quyết định;
> Frontend Phase 3 (`P3-FE-01`) cũng đã hoàn thành cùng ngày — **toàn bộ
> dự án nay là 50/50 (100%)**.

#### Backend / Hạ tầng
- [x] P3-BE-01 Job dọn session hết hạn định kỳ — `SessionCleanupJob`
  (`backend/src/session/session-cleanup.job.ts` + spec, `@nestjs/schedule`
  `EVERY_HOUR`, dùng đúng index `sessions.expires_at` có sẵn qua
  `SessionRepository.deleteExpired()`) — Hoàn thành (cập nhật: 2026-10-19)
- [x] P3-BE-02 CAPTCHA nâng cao rate-limit — **Đã quyết định KHÔNG triển
  khai**: chạy lại `threat-modeler` review (STRIDE, DoS/brute-force/spam)
  trên rate-limit+account-lockout đã code, kết luận không cần CAPTCHA ở
  Phase 3 này; ghi lại chính thức tại
  `docs/architecture/adr/0002-no-captcha-phase-3-hardening.md` (kèm 4
  điều kiện kích hoạt lại review trong tương lai) — Hoàn thành/Đã quyết
  định (cập nhật: 2026-10-19)
- [x] P3-BE-03 Rate-limit nhẹ theo phiên Admin cho lock/unlock (T10) —
  `backend/src/admin/rate-limit-policies.ts`
  (`ADMIN_LOCK_UNLOCK_RATE_LIMIT`, key theo actor admin không theo IP),
  `admin.service.ts` `consumeAdminActionRateLimit()` gọi trước transaction
  của `lockUser`/`unlockUser`; mã lỗi `ADMIN_LOCK_UNLOCK_RATE_LIMITED` đã
  thêm vào `api-spec-multi-user-system.md` (v1.2) — Hoàn thành (cập nhật:
  2026-10-19)
- [x] P3-BE-04 DB trigger phòng hộ bổ sung cho last-admin rule (tùy chọn,
  T11) — **Đã quyết định bỏ qua**: tầng service (`LastAdminPolicyService`)
  đã dùng `SELECT ... FOR UPDATE` trong transaction, đủ an toàn; HLD/LLD
  cũng ghi rõ đây là tùy chọn — không thêm migration/trigger — Hoàn
  thành/Đã quyết định (cập nhật: 2026-10-19)
- [x] P3-BE-05 Test tích hợp race-condition last-admin (2 ADMIN cuối cùng
  đồng thời hạ cấp/khóa lẫn nhau — bắt buộc, không phải tùy chọn) —
  `backend/test/last-admin-race.e2e-spec.ts` (gọi trực tiếp `AdminService`
  với Prisma thật, 2 kịch bản `lockUser`/`changeRole` đồng thời 2 chiều,
  lặp 20 lần mỗi kịch bản theo yêu cầu test-plan) — code xong, `tsc`/
  `eslint` sạch, đã chạy thử xác nhận code chạm đúng tới Prisma thật
  (dừng ở lỗi kết nối DB, không phải lỗi logic) — **nhưng CHƯA tự chạy
  pass được** vì sandbox này không có Postgres/Docker reachable. Cần
  người dùng tự chạy `npm run test:e2e` trên máy có Postgres thật để xác
  nhận pass — Hoàn thành (code)/Chờ xác nhận chạy thật (cập nhật:
  2026-10-19)

#### Frontend
- [x] P3-FE-01 Hoàn thiện UI theo đầy đủ checklist accessibility + nguyên
  tắc thị giác futuristic (`ui-wireframes-multi-user-system.md`) — Hoàn
  thành (cập nhật 2026-10-19). Rà soát toàn bộ 2 mục "Nguyên tắc thị giác
  dùng chung" và "Khả năng tiếp cận (Accessibility)" so với code Phase
  0–2 đã có (phần lớn đã đạt từ trước: label thật + `aria-describedby`/
  `aria-invalid`, focus trap + `Esc` + `role="dialog"` trong
  `ConfirmDialog`, `:focus-visible` glow toàn cục, `prefers-reduced-motion`
  toàn cục, bảng `<table>` ngữ nghĩa + nhãn ngữ cảnh đầy đủ cho nút hành
  động). 5 khoảng hở thực tế tìm thấy và đã sửa:
  - Badge vai trò (`UsersTable`, `UserMenu`, `ProfileBasicInfoSection`)
    trước đó hardcode màu tím cho mọi role, sai với bảng "Nguyên tắc thị
    giác" (ADMIN = tím, USER = cyan) — tách thành component dùng chung
    `components/ui/RoleBadge.tsx`.
  - Skeleton loading (`DataTable`, `ShellSkeleton`) dùng `animate-pulse`
    (nhấp nháy mờ/tỏ), không đúng "dải gradient sáng chạy ngang" theo đặc
    tả — thêm class tiện ích `.skeleton-shimmer` (`globals.css`, tôn
    trọng `prefers-reduced-motion` qua rule toàn cục có sẵn).
  - `UserMenu` (dropdown trong `NavBar`) thiếu đóng bằng `Esc`, đóng khi
    click ra ngoài, và quản lý focus (focus vào menu khi mở, trả về nút
    trigger khi đóng) — bổ sung theo đúng pattern đã có ở `ConfirmDialog`.
  - `ToastProvider` dùng chung một vùng `aria-live="polite"` cho cả
    thành công lẫn lỗi, trong khi mục Accessibility yêu cầu lỗi nghiêm
    trọng dùng `assertive` — tách thành 2 vùng `aria-live` riêng
    (`assertive` cho lỗi, `polite` cho thành công).
  - `CheckEmailPanel` hiển thị lỗi resend bằng `<p>` trần (không
    `aria-live`/`role`/icon), không nhất quán với `ErrorBanner` dùng ở
    nơi khác — đổi sang dùng `ErrorBanner` chung (thêm `className` prop
    cho component này để tái dùng được ở đây).
  - Kiểm thử: `tsc --noEmit`, `eslint .`, `next build` (frontend) đều
    sạch, cả 10 route vẫn generate thành công. **Chưa kiểm tra trực quan
    bằng trình duyệt/screenshot thật** (không có công cụ browser trong
    sandbox này) — chỉ xác nhận ở mức biên dịch/kiểu/lint, giống giới hạn
    đã ghi nhận ở Phase 0–2.
