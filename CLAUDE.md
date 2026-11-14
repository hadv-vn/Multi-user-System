# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Multi-user web system: registration, email verification, login, password reset, server-side sessions, and role-based access control (USER/ADMIN). npm-workspaces monorepo with `backend/` (NestJS + Prisma + PostgreSQL) and `frontend/` (Next.js App Router + Tailwind CSS). Node 20.19+/22.12+/24+ (`.nvmrc` pins 24). The repo is also meant to serve as a base for future systems, so keep the core modules generic and add new business features as new modules.

## Commands

Run from the repo root unless noted.

| Task | Command |
|---|---|
| Install | `npm install` (backend `postinstall` runs `prisma generate`) |
| Lint everything | `npm run lint` |
| Unit tests (backend only; frontend has none yet) | `npm test` |
| Build everything | `npm run build` (frontend build needs `NEXT_PUBLIC_API_BASE_URL`) |
| Backend dev server (port 8081) | `npm run start:dev --workspace=backend` |
| Frontend dev server (port 8080) | `npm run dev --workspace=frontend` |
| Single test file | `cd backend && npx vitest run src/auth/auth.service.spec.ts` |
| Single test by name | `cd backend && npx vitest run -t "chuẩn hóa email"` |
| Backend coverage | `npm run test:cov --workspace=backend` |
| Backend e2e (needs a real Postgres) | `npm run test:e2e --workspace=backend` |
| Apply migrations / seed | `npm run db:migrate --workspace=backend` / `npm run db:seed --workspace=backend` |
| New migration (dev) | `cd backend && npx prisma migrate dev --name <snake_case_name>` |
| Format | `npm run format --workspace=backend` / `--workspace=frontend` |
| Run whole stack natively | `./scripts/build-all.sh` then `./scripts/run-all.sh`; stop with `./scripts/stop-all.sh` |
| Run whole stack in Docker | `cp .env.docker.example .env && docker compose up -d --build` |

- Unit tests are `*.spec.ts` next to the source file; e2e tests are `backend/test/*.e2e-spec.ts` (Vitest, not Jest).
- `backend/test/last-admin-race.e2e-spec.ts` temporarily locks every ACTIVE admin in the target database, so only run e2e against a disposable database.
- CI (`.github/workflows/ci.yml`) runs lint + unit tests + build, backend e2e against a Postgres service, and a `docker compose` smoke test. Keep all three green.

## Architecture

### Backend (`backend/src`)

Modular monolith with one NestJS module per bounded context, wired in `app.module.ts`:

- `auth/`: register, login, email verification, forgot/reset password, account lockout after failed logins.
- `session/`: server-side sessions stored in Postgres (no JWT, see `docs/architecture/adr/0001-session-management-strategy.md`), `AuthGuard`, `@CurrentUser()`, expired-session cleanup cron job.
- `rbac/`: `RolesGuard` + `@Roles()` decorator, role names in `role.constants.ts`, `LastAdminPolicyService` (row lock prevents removing the last ACTIVE admin).
- `account/`: own profile, change password, self-deactivate.
- `admin/`: list users, lock/unlock, change role. Writes an append-only `AdminActionLog`.
- `email/`: `EmailSender` interface (token `EMAIL_SENDER`), Nodemailer SMTP implementation.
- `common/`: Prisma service, env validation, CSRF (double-submit cookie, `CsrfGuard`), in-memory rate limiter behind `RateLimiter` (token `RATE_LIMITER`), password hasher / token generator interfaces, `AllExceptionsFilter`.

Conventions to follow when adding code:

- **Repository pattern with DI tokens**: each module defines `*-repository.interface.ts` (interface + injection token constant) and a `prisma-*.repository.ts` implementation, bound in the module via `{ provide: TOKEN, useClass: PrismaX }`. Services depend on the token or interface for data access. Services inject `PrismaService` only to open a `$transaction`, then pass the `tx` (`common/prisma/prisma-transaction.type.ts`) into repository methods (see `admin.service.ts`).
- **Errors**: business errors are classes in `<module>/exceptions/` that extend `common/exceptions/app.exception.ts` with a stable `errorCode`. `AllExceptionsFilter` maps them to the API error envelope defined in `docs/design/api-spec-multi-user-system.md`.
- **Input**: DTOs in `<module>/dto/` validated by class-validator. The global `ValidationPipe` uses `whitelist` + `forbidNonWhitelisted`.
- **Env vars**: every new variable must be declared in `common/config/environment-variables.ts` (validated at startup) and added to `backend/.env.example`, `compose.yaml`, and the CI e2e job env.
- **ESM**: the backend is `"type": "module"`, so relative imports must end in `.js`.
- **Prisma**: the client is generated into `src/generated/prisma` (gitignored). Models use camelCase mapped to snake_case tables and columns via `@map`/`@@map`. Value lists such as `users.status` and `admin_action_log.action_type` are enforced by CHECK constraints in migration SQL.
- **Routes**: `api/v1/<resource>`; `GET /health` is the liveness probe.
- `NODE_ENV=production` turns on `secure` cookies. Only set it when serving over HTTPS.

### Frontend (`frontend/src`)

- **Next.js 16 differs from older versions.** Read `node_modules/next/dist/docs/` before writing Next code (see `frontend/AGENTS.md`). `src/proxy.ts` replaces `middleware.ts`. It only checks that the session cookie exists; real authorization stays on the backend.
- `app/(public)/` holds the auth screens and `app/(authenticated)/` holds profile and admin, wrapped by the shell layout.
- `features/<name>/{components,hooks}` contains feature UI and logic. `lib/<name>/*-api.ts` contains typed API clients built on `lib/http/` (`HttpClient` interface, CSRF-aware fetch client, API envelope types). `components/ui/` holds shared glassmorphism primitives; reuse them before creating new ones.
- `NEXT_PUBLIC_*` values are read through `config/public-env.ts` and inlined at build time, so changing them requires a rebuild.

### Adding a new business feature

Backend: add a new `backend/src/<feature>/` module (controller, service, dto, exceptions, repository interface + Prisma implementation, `*.spec.ts`), a Prisma migration, and import the module in `app.module.ts`. Protect routes with `AuthGuard`/`RolesGuard`, and add `CsrfGuard` on state-changing routes, the same way as the existing controllers. Frontend: add `lib/<feature>/<feature>-api.ts`, `features/<feature>/`, and routes under `app/(authenticated)/`.

### Docs and deployment

- `docs/` holds the SDLC artifacts: SRS, HLD/LLD, data model, API spec, UI wireframes, threat model, test plan, ADRs, and progress. Update the relevant design doc when behavior changes.
- Native deployment runs exactly one backend (8081) and one frontend (8080), because the rate limiter is in memory. Running multiple backend instances requires a shared `RateLimiter` implementation, such as one backed by Redis.
- Docker: `backend/Dockerfile` and `frontend/Dockerfile` are multi-stage builds with the repo root as build context. `compose.yaml` runs postgres, mailpit (port 8025), a one-shot `migrate` service (migrate + seed), the backend, and the frontend. The settings live in the root `.env`, created from `.env.docker.example`.

## UI Design Principles

All UI must have a futuristic look and feel. When building or reviewing UI:
- Prefer dark, high-contrast themes with accent colors (neon/glow tones) over flat light themes.
- Use glassmorphism (translucency, blur) and subtle gradients instead of plain solid backgrounds.
- Use geometric, clean sans-serif typography — avoid ornate or overly traditional fonts.
- Favor smooth motion/transition effects (fade, glow, slide) over static, abrupt UI changes.
- Avoid skeuomorphic or dated Web 1.0/Material-default styling; lean toward sci-fi/HUD-inspired visual language.

## Code Style Principles

Code must be clear and object-oriented. When writing or reviewing code:
- Model domains with classes/objects (OOP) rather than loose procedural scripts or God functions/files.
- Follow SOLID:
  - **S**ingle Responsibility — each class/module has one reason to change.
  - **O**pen/Closed — extend behavior via new code (subclasses, strategies), avoid editing stable code for every new case.
  - **L**iskov Substitution — subtypes must be usable anywhere their base type is expected, without surprises.
  - **I**nterface Segregation — prefer small, focused interfaces over large catch-all ones.
  - **D**ependency Inversion — depend on abstractions/interfaces, not concrete implementations; inject dependencies rather than hardcoding them.
- Apply standard design patterns (Factory, Strategy, Observer, Repository, Adapter, Singleton, etc.) where they genuinely fit the problem — don't force a pattern where plain code is clearer.
- Favor clear, descriptive naming and small, cohesive classes/methods over clever or terse code.
- Avoid premature abstraction: only introduce a pattern/interface when there is a real current need (e.g. multiple implementations, need to swap behavior), not speculative future-proofing.
- No "free-style" formatting — follow the official Google Style Guide for the language in use (e.g. Google Java Style Guide, Google TypeScript/JavaScript Style Guide, Google C++ Style Guide, PEP 8 for Python per Google's Python Style Guide), including naming conventions, indentation, file/class layout, and import ordering.
- Use/configure the matching linter/formatter for the chosen language (e.g. ESLint+Prettier with Google config, clang-format, checkstyle) once the stack is decided, and keep code passing it — do not hand-roll inconsistent formatting.

## File & Folder Naming Conventions

Names must be consistent and predictable — no mixing styles within the same project:
- **Folders**: `kebab-case` (e.g. `user-profile/`, `order-service/`).
- **Source files**: follow the language's Google Style Guide convention —
  - Java/Kotlin: `PascalCase.java`/`.kt` matching the public class name.
  - Python: `snake_case.py`.
  - JS/TS: `kebab-case.ts` for modules/utilities, `PascalCase.tsx` for components/classes.
  - C++: `snake_case.cc`/`.h`.
- **Classes/Types**: `PascalCase` (e.g. `UserRepository`, `OrderController`).
- **Functions/variables**: `camelCase` (JS/TS/Java) or `snake_case` (Python), per that language's Google Style Guide — never mixed within one file.
- **Constants**: `UPPER_SNAKE_CASE`.
- **Test files**: mirror the file under test with a `*.test.*`/`*_test.*`/`*Test.*` suffix matching the language convention, placed alongside or in a parallel `tests/`/`__tests__/` structure.
- **No spaces, no uppercase folder names, no ambiguous abbreviations** — prefer clear full words over cryptic shortenings.

## Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<optional scope>): <short summary, imperative mood, lowercase, no trailing period>

<optional body: explain why, not what>

<optional footer: BREAKING CHANGE:, Refs:, Closes:>
```

- **Allowed types**: `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `chore`, `perf`, `build`, `ci`.
- **Scope** (optional): the affected module/feature, e.g. `feat(auth): add refresh token rotation`.
- **Summary**: ≤ 72 chars, describes what the commit does, not a changelog of files touched.
- **Breaking changes**: add `!` after type/scope (e.g. `feat(api)!: ...`) and a `BREAKING CHANGE:` footer explaining the impact.
- One logical change per commit — do not bundle unrelated fixes/features into a single commit.

## Multi-user System — Quy tắc & phong cách code

> Soạn bởi `/my-style:init` — 9 nguyên tắc nền + áp dụng cụ thể theo
> stack: npm-workspaces monorepo TypeScript — backend NestJS + Prisma +
> PostgreSQL (Vitest), frontend Next.js 16 App Router + Tailwind; script
> tiện ích Python `build_and_run.py`.

### Git — an toàn

- Không tự tạo branch mới, không tự `git commit`, không tự `git push` nếu
  người dùng chưa yêu cầu hoặc chưa đồng ý rõ ràng. Luôn hỏi xác nhận trước
  khi thực hiện các hành động này, ở MỌI project có plugin `my-style`.

### 1. "Taste" và cấu trúc dữ liệu — Linus Torvalds (Linux, Git)

Developer kém lo về code, developer giỏi lo về cấu trúc dữ liệu và quan hệ
giữa chúng. "Taste" là viết code sao cho trường hợp đặc biệt (edge case)
biến mất, thay vì thêm nhiều `if` để xử lý từng trường hợp riêng. Thẳng
thắn trong review, giữ chuẩn mực cao, không ngại nói thẳng khi thiết kế tệ.

**Áp dụng vào project này:** Bắt đầu mọi tính năng từ `schema.prisma` và
migration SQL — ràng buộc dữ liệu (CHECK constraint cho `users.status`,
`admin_action_log.action_type`, row lock của `LastAdminPolicyService`) để
DB loại bỏ trạng thái sai, thay vì rải `if` kiểm tra trong service. Chuẩn
hoá đầu vào một lần ở DTO/class-validator (ví dụ chuẩn hoá email) để tầng
dưới không phải xử lý biến thể. Danh sách giá trị cố định đặt ở file
`*.constants.ts` (như `role.constants.ts`, `task-status.constants.ts`)
thay vì chuỗi literal rải rác.

### 2. Tập trung sâu và thực dụng — John Carmack (Doom, Quake)

Làm việc theo những khoảng tập trung dài, đào sâu đến tận gốc vấn đề thay vì
vá lỗi hời hợt. Chạy từng bước code trong debugger để hiểu chính xác máy
đang làm gì, không đoán. Ưu tiên code đơn giản, dễ đoán, hạn chế trạng thái
thay đổi lung tung (mutable state) — đặc biệt quan trọng ở nơi hiệu năng và
sự ổn định là tối quan trọng.

**Áp dụng vào project này:** Khi test fail hoặc có bug, tái hiện bằng một
spec Vitest rồi debug (`npm run test:debug --workspace=backend`) thay vì
đoán. Các vùng nhạy cảm về tính đúng đắn — session, lockout sau đăng nhập
sai, CSRF, chặn xoá admin cuối cùng — phải hiểu tới gốc (transaction, row
lock) trước khi sửa. Service NestJS giữ stateless; trạng thái duy nhất trong
bộ nhớ là `InMemoryRateLimiter`, đừng thêm cái khác.

### 3. Đơn giản tối đa — Ken Thompson & Rob Pike (Unix, Go)

Triết lý Unix: mỗi chương trình làm một việc và làm thật tốt, rồi ghép các
chương trình nhỏ lại với nhau. "Rõ ràng hơn khôn lỏi" (clear is better than
clever) — Go được thiết kế ít tính năng một cách có chủ đích, không thêm
cơ chế chỉ vì nó khả thi.

**Áp dụng vào project này:** Mỗi NestJS module là một bounded context làm
một việc (`auth`, `session`, `rbac`, `account`, `admin`, `email`), ghép với
nhau qua DI token (`EMAIL_SENDER`, `RATE_LIMITER`, repository token). Một
service = một trách nhiệm (ví dụ `TaskService` và `TaskStatisticsService`
tách riêng). Không thêm thư viện/cơ chế mới (queue, cache, JWT...) khi cơ
chế sẵn có đã đủ.

### 4. Test và bước nhỏ — Kent Beck (TDD, Extreme Programming)

Viết test trước, code sau, rồi refactor. "Make it work, make it right, make
it fast" — đúng theo thứ tự đó, không nhảy cóc sang tối ưu khi chưa đúng và
chưa rõ ràng. Thay đổi code theo từng bước nhỏ, an toàn, luôn giữ code ở
trạng thái chạy được giữa các bước.

**Áp dụng vào project này:** Test runner là Vitest. Viết `*.spec.ts` cạnh
service/repository trước khi implement (mock repository qua interface token),
chạy nhanh bằng `cd backend && npx vitest run <file>`. Luồng API xuyên nhiều
tầng thêm e2e ở `backend/test/*.e2e-spec.ts` (chỉ chạy trên DB dùng một
lần). Frontend chưa có test — tính năng frontend mới nên thêm test thay vì
mở rộng khoảng trống này. Trước khi commit: `npm run lint && npm test &&
npm run build` phải xanh, giống CI.

### 5. Refactor liên tục — Martin Fowler

Coi code như vườn cây cần chăm sóc thường xuyên, nhận diện "code smell" để
dọn dẹp ngay khi thấy, không để tích tụ. "Ai cũng viết được code máy hiểu.
Developer giỏi viết code con người hiểu."

**Áp dụng vào project này:** Khi chạm vào một module, dọn smell gặp phải
trong cùng phạm vi đó nhưng tách thành commit `refactor(<scope>)` riêng,
không trộn với `feat`/`fix`. Smell cần để ý: service gọi Prisma trực tiếp
thay vì qua repository, business error ném `Error` thay vì class kế thừa
`AppException`, component UI trùng lặp thay vì dùng lại `components/ui/`.
Tài liệu trong `docs/` lệch so với code cũng là smell — sửa cùng lúc.

### 6. Code là để đọc — Donald Knuth & Guido van Rossum

"Literate programming": viết chương trình như một bài văn giải thích cho
người đọc. "Tối ưu hóa sớm là gốc rễ của mọi tội lỗi" (premature
optimization is the root of all evil) — đừng tối ưu trước khi đo. Python
đặt "Readability counts" làm giá trị cốt lõi.

**Áp dụng vào project này:** Tên class/method mô tả nghiệp vụ
(`LastAdminPolicyService`, `SessionCleanupJob`), tên test mô tả hành vi
(project đang viết tên test bằng tiếng Việt — giữ nhất quán). Không thêm
cache/tối ưu query khi chưa đo được vấn đề; nếu nghi ngờ chậm, đo trước
(log thời gian query, `EXPLAIN` trên Postgres) rồi mới sửa.

### 7. Ước lượng bằng con số — Jeff Dean (Google)

Trước khi thiết kế, ước lượng nhanh trên giấy (back-of-the-envelope) về độ
trễ, băng thông, bộ nhớ. Thuộc các con số cơ bản (đọc RAM, đọc SSD, round-trip
mạng mất bao lâu...) để biết ngay thiết kế nào khả thi trước khi code.

**Áp dụng vào project này:** Project chủ yếu là CRUD, không cần ước lượng
sâu. Hai chỗ đáng tính nhẩm: (1) mỗi request có session đều đọc bảng session
trong Postgres — ước lượng số request/giây × một round-trip DB trước khi
thêm truy vấn vào `AuthGuard`; (2) endpoint thống kê/danh sách (admin users,
task statistics) — ước lượng số dòng sẽ quét, luôn phân trang và có index
phù hợp.

### 8. Code như nghệ thuật — Salvatore Sanfilippo "antirez" (Redis)

Code có cá tính và có thẩm mỹ, không chỉ là công cụ vô hồn. Viết comment để
giải thích TẠI SAO, không phải chỉ làm gì (cái "làm gì" đã nằm trong code).
Dám bỏ bớt tính năng để giữ thiết kế gọn, thay vì ôm đồm mọi yêu cầu.

**Áp dụng vào project này:** Comment ở những chỗ quyết định không hiển nhiên:
vì sao dùng row lock khi đổi role admin, vì sao rate limiter chỉ chạy một
instance, vì sao cookie chỉ `secure` khi `NODE_ENV=production`. Quyết định
lớn ghi thành ADR trong `docs/architecture/adr/`. Core modules giữ chung
chung để làm nền cho hệ thống khác — tính năng nghiệp vụ không thuộc lõi thì
đưa vào module riêng, đừng nhồi vào `auth`/`admin`.

### 9. Quy ước thay cho cấu hình — David Heinemeier Hansson (Ruby on Rails)

Convention over configuration: theo quy ước chung thì không cần cấu hình
từng thứ một. Ưu tiên niềm vui và năng suất của developer, chọn giải pháp
đơn giản (ví dụ "majestic monolith") thay vì kiến trúc phức tạp chỉ vì đang
thịnh hành.

**Áp dụng vào project này:** Project đã là modular monolith — giữ như vậy,
không tách microservice. Theo đúng quy ước sẵn có thay vì tự đặt cấu trúc
mới: `*-repository.interface.ts` + `prisma-*.repository.ts`, `dto/`,
`exceptions/`, route `api/v1/<resource>`, `features/<name>` +
`lib/<name>/*-api.ts` ở frontend, Conventional Commits. Lưu ý lệch quy ước
hiện có: module task nằm ở `backend/src/features/todo-task-module/` trong
khi CLAUDE.md hướng dẫn `backend/src/<feature>/` — cần thống nhất một quy
ước cho module mới.
