# Multi-User System

Hệ thống web hỗ trợ nhiều người dùng với đăng ký/đăng nhập, quản lý phiên
(session) và phân quyền theo vai trò (RBAC). Được xây dựng theo quy trình
SDLC đầy đủ — xem [docs/](docs/) để biết yêu cầu, kiến trúc, thiết kế, bảo
mật và kế hoạch test gốc.

## Trạng thái hiện tại

Toàn bộ 4 phase (0–3) đã hoàn thành cho cả backend và frontend — 50/50 hạng
mục (cập nhật 2026-10-19).

- **Backend (NestJS + Prisma + PostgreSQL)**: Phase 0 (nền tảng), Phase 1
  (Auth + Session), Phase 2 (RBAC + Account + Admin) và Phase 3 (hardening)
  đã hoàn thành, có unit test.
- **Frontend (Next.js + Tailwind CSS)**: đủ các màn hình đăng ký, đăng nhập,
  xác thực email, quên/đặt lại mật khẩu, hồ sơ cá nhân và quản trị người
  dùng; Phase 3 (UI polish) đã xong. Chưa có test tự động cho frontend.
- **Triển khai**: 1 backend + 1 frontend chạy trên server, truy cập được
  từ máy khác trong mạng LAN — xem
  [Truy cập từ máy khác trong mạng LAN](#truy-cập-từ-máy-khác-trong-mạng-lan).

Chi tiết tiến độ theo từng hạng mục: [docs/progress/progress-multi-user-system.md](docs/progress/progress-multi-user-system.md).

## Kiến trúc tổng quan

- **Monorepo** qua npm workspaces: `backend/` và `frontend/`.
- **Backend**: NestJS (TypeScript), modular monolith, một module theo mỗi
  bounded context (`auth`, `session`, `rbac`, `account`, `admin`, `email`,
  `common`).
- **Database**: PostgreSQL qua Prisma. Session lưu phía server trong
  Postgres (không dùng JWT) — xem
  [ADR-0001](docs/architecture/adr/0001-session-management-strategy.md).
- **Email**: gửi qua SMTP (Nodemailer) sau một interface `IEmailSender`.
- **Frontend**: Next.js (App Router) + Tailwind CSS, gọi API backend qua
  `NEXT_PUBLIC_API_BASE_URL`; tổ chức theo `features/` (`auth`, `session`,
  `account`, `admin`).
- **Triển khai**: chạy đúng 1 backend (cổng 8081) và 1 frontend (cổng 8080).

Xem đầy đủ tại [docs/design/hld-multi-user-system.md](docs/design/hld-multi-user-system.md).

## Yêu cầu môi trường

- Node.js **20.19+, 22.12+ hoặc 24+** (khuyến nghị 24 LTS, ghi trong
  `.nvmrc`) — yêu cầu của Prisma và Next.js 16. Gói `nodejs` trong apt của
  Ubuntu 24.04 chỉ có bản 18, **không dùng được**; cài qua
  [nvm](https://github.com/nvm-sh/nvm):

  ```bash
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
  source ~/.bashrc
  nvm install          # đọc .nvmrc -> Node 24
  node -v              # v24.x
  ```
- PostgreSQL 14+ đang chạy và có thể kết nối được (local, container, hoặc
  cloud DB). Cài trên chính server (Ubuntu 24.04 có sẵn PostgreSQL 16):

  ```bash
  sudo apt install -y postgresql
  ./scripts/setup-database.sh   # tạo user + database theo DATABASE_URL trong backend/.env
  ```
- (Tùy chọn) Một SMTP sandbox để xem email xác thực/đặt lại mật khẩu khi
  phát triển, ví dụ [Mailpit](https://github.com/axllent/mailpit) hoặc
  MailDev, lắng nghe ở `localhost:1025`.

## Cài đặt & chạy nhanh

### Cách 1 — dùng script có sẵn (khuyến nghị, Linux)

```bash
./scripts/build-all.sh                 # build backend + frontend
./scripts/run-all.sh                   # dừng tiến trình cũ, migrate, chạy nền
./scripts/stop-all.sh                  # dừng tất cả
```

| Script | Việc làm |
|---|---|
| `build-all.sh [--skip-install]` | Tạo `backend/.env`, `frontend/.env` từ `.env.example` nếu chưa có (tự điền IP LAN của server + `CSRF_SECRET` ngẫu nhiên), `npm install`, build backend và frontend. |
| `run-all.sh [--build] [--skip-migrate]` | Gọi `stop-all.sh`, (tùy chọn) build, kiểm tra PostgreSQL, chạy migration + seed, rồi chạy nền 1 backend và 1 frontend. Log ở `.runtime/logs/`. |
| `stop-all.sh` | Dừng mọi tiến trình đang chiếm cổng frontend/backend (SIGTERM, quá 10 giây thì SIGKILL). |
| `setup-database.sh` | Chạy một lần (cần sudo): tạo user + database PostgreSQL theo `DATABASE_URL` trong `backend/.env`. Chạy lại an toàn — chỉ đặt lại mật khẩu cho khớp `.env`, không xóa dữ liệu. |

Sơ đồ cổng:

| Thành phần | Cổng | Mở firewall |
|---|---|---|
| Frontend (Next.js) | `8080` | Có |
| Backend (NestJS, API `/api/v1`) | `8081` | Có |

```bash
sudo ufw allow 8080/tcp && sudo ufw allow 8081/tcp
```

`NEXT_PUBLIC_API_BASE_URL` được nhúng vào frontend lúc build — đổi giá trị
này thì phải chạy lại `build-all.sh`.

### Tài khoản admin mặc định

`npm run db:seed` (được `run-all.sh` gọi mỗi lần chạy) tạo một tài khoản
**ADMIN** đã xác thực email từ 2 biến trong `backend/.env`:

```
SEED_ADMIN_EMAIL=admin@gmail.com
SEED_ADMIN_PASSWORD=<mật khẩu>
```

- Chỉ tạo khi email chưa tồn tại — chạy seed lại không ghi đè mật khẩu đã
  đổi trên giao diện. Muốn đặt lại, đổi mật khẩu ở trang Hồ sơ.
- Mật khẩu phải đạt quy tắc chung (≥ 8 ký tự, có chữ cái và chữ số).
- Không ghi mật khẩu thật vào `.env.example` (file này được commit lên git).
  Bỏ trống một trong hai biến thì seed bỏ qua bước tạo admin.

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

Backend chạy ở `http://localhost:8081` (cấu hình qua `PORT` trong
`backend/.env`). Endpoint kiểm tra nhanh: `GET /health`.

## Truy cập từ máy khác trong mạng LAN

Mô hình: các máy khác chỉ cần trình duyệt, mọi thứ chạy trên server.

```
Máy khác (trình duyệt)
  ├─► http://<IP-server>:8080          frontend (Next.js)
  └─► http://<IP-server>:8081/api/v1   backend (NestJS)
```

### 1. Xác định IP LAN của server

```bash
ip -4 addr show scope global | grep inet
# ví dụ: inet 192.168.50.10/24 ... eth0  ->  IP server là 192.168.50.10
```

Nên đặt IP tĩnh (hoặc DHCP reservation trên router) cho server — nếu IP đổi,
phải cập nhật lại các file `.env` và build lại frontend.

### 2. Cấu hình `.env` theo IP server

`build-all.sh` tự điền IP khi tạo `.env` lần đầu. Nếu `.env` đã có sẵn, kiểm
tra 3 giá trị sau (thay `192.168.50.10` bằng IP của bạn):

| File | Biến | Giá trị |
|---|---|---|
| `backend/.env` | `CORS_ORIGIN` | `http://192.168.50.10:8080` |
| `backend/.env` | `APP_BASE_URL` | `http://192.168.50.10:8080` |
| `frontend/.env` | `NEXT_PUBLIC_API_BASE_URL` | `http://192.168.50.10:8081/api/v1` |

- `CORS_ORIGIN` chỉ nhận **một** origin, nên phải luôn mở frontend bằng IP
  (`http://192.168.50.10:8080`), kể cả trên chính server — mở bằng
  `localhost:8080` sẽ bị lỗi CORS khi gọi API.
- `APP_BASE_URL` dùng để tạo link trong email xác thực / đặt lại mật khẩu.
- `NEXT_PUBLIC_API_BASE_URL` được nhúng lúc build — sửa xong phải chạy lại
  `./scripts/build-all.sh`.

### 3. Mở firewall (một lần, cần sudo)

```bash
sudo ufw allow 8080/tcp   # frontend
sudo ufw allow 8081/tcp   # backend (API)
sudo ufw status
```

### 4. Khởi động hệ thống

```bash
./scripts/run-all.sh --build
```

### 5. Truy cập từ máy khác

Mở trình duyệt trên máy cùng mạng LAN và vào `http://192.168.50.10:8080`
(tự chuyển tới `/login`). Người dùng mới đăng ký tài khoản tại
`http://192.168.50.10:8080/register`.

Kiểm tra nhanh từ máy khác:

```bash
curl http://192.168.50.10:8081/health   # -> {"status":"ok"}
curl -I http://192.168.50.10:8080/login # -> HTTP/1.1 200 OK
```

### Xử lý sự cố

| Triệu chứng | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| Không mở được trang (timeout) | Firewall chặn hoặc khác mạng | `sudo ufw status`; kiểm tra 2 máy cùng subnet (`ping <IP-server>`) |
| Trang mở được nhưng đăng nhập/đăng ký báo lỗi mạng | API `8081` không truy cập được | `curl http://<IP>:8081/health`; xem log `.runtime/logs/backend-8081.log` |
| Lỗi CORS trong console trình duyệt | `CORS_ORIGIN` không khớp địa chỉ đang mở | Mở đúng `http://<IP>:8080`, hoặc sửa `CORS_ORIGIN` rồi chạy lại `run-all.sh` |
| Frontend vẫn gọi IP/cổng cũ | `NEXT_PUBLIC_API_BASE_URL` chưa được build lại | `./scripts/build-all.sh` rồi `./scripts/run-all.sh` |
| Link trong email trỏ tới `localhost` | `APP_BASE_URL` chưa đổi sang IP | Sửa `APP_BASE_URL` rồi chạy lại `run-all.sh` |

## Chạy test

```bash
# Toàn bộ workspace (hiện chỉ backend có test)
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
frontend/       Next.js frontend
  src/
    app/        Route: (public) đăng ký/đăng nhập..., (authenticated) profile, admin
    features/   Logic + component theo tính năng (auth, session, account, admin)
    components/ UI dùng chung
    lib/        HTTP client, API client, session, validation
docs/            Tài liệu SDLC: requirements, architecture, design, security, testing, progress
scripts/         Script build / chạy / dừng hệ thống, tạo database
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
naming convention theo ngôn ngữ, UI futuristic/glassmorphism, và
[Conventional Commits](https://www.conventionalcommits.org/) cho commit
message.
