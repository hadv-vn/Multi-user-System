# API Design Spec — Multi-User System: Module Auth + RBAC

| | |
|---|---|
| **Phiên bản** | 1.1 (draft) — bổ sung mã lỗi `CSRF_TOKEN_INVALID` (mục 1.6.1) theo LLD Phase 2 |
| **Trạng thái** | DRAFT — bản thiết kế contract, CHƯA implement, chưa chạy qua công cụ validate |
| **Ngày tạo** | 2026-10-18 (cập nhật 2026-10-18 — bổ sung CSRF theo C‑14) |
| **Nguồn tham chiếu** | `docs/requirements/srs-multi-user-system.md` (SRS v1.0), `docs/architecture/adr/0001-session-management-strategy.md` (ADR 0001 — server-side session, cookie httpOnly, không JWT), `docs/design/lld-phase2-rbac-account-admin.md` (LLD Phase 2 — nguồn quyết định cơ chế CSRF cụ thể ở mục 1.6.1) |
| **Phạm vi** | REST contract cho 5 module: Auth, Session, Rbac (cross-cutting, không có endpoint riêng), Account, Admin |

> Đây là dự án mới hoàn toàn, chưa có API nào tồn tại trước đó. Toàn bộ convention bên dưới (Mục 1) là **convention lần đầu được định nghĩa cho dự án**, không có hệ thống cũ để đối chiếu. Convention này cần được áp dụng nhất quán cho mọi module/endpoint phát triển sau này.

---

## 1. Quy ước chung (áp dụng cho toàn bộ API)

### 1.1 Base URL & Versioning
- Tất cả endpoint nằm dưới prefix `/api/v1`.
- Versioning qua URL path (`v1`, `v2`...) — chọn cách này vì đơn giản, dễ debug qua browser/curl, không cần client tùy biến header. *(Giả định — dự án không có yêu cầu versioning cụ thể, chọn URL-path versioning vì đây là lựa chọn phổ biến/an toàn nhất khi chưa có constraint khác.)*

### 1.2 Naming resource & path
- Danh từ số nhiều cho resource tập hợp: `/admin/users` (không phải `/admin/user`).
- Path phẳng theo module, không lồng quá 2 cấp: `/auth/*`, `/account/*`, `/admin/users/*`.
- Nhóm `/auth/*` và `/account/change-password`, `/account/deactivate` là **action-style endpoint** (verb-based), KHÔNG theo thuần REST resource CRUD, vì bản chất các hành động này (đăng ký, đăng nhập, đổi mật khẩu...) là *command/side-effect theo nghiệp vụ*, không phải CRUD trên một resource độc lập. Đây là lựa chọn thiết kế thực dụng phổ biến (tương tự Auth0, GitHub OAuth flows), áp dụng nhất quán cho mọi action tương tự về sau.
- `kebab-case` cho các segment nhiều từ: `/auth/forgot-password`, `/auth/resend-verification`, `/auth/verify-email`.
- Path param dùng danh từ số ít + id: `/admin/users/{id}/lock`.

### 1.3 HTTP method & status code
| Method | Dùng khi | Idempotent? |
|---|---|---|
| `GET` | Đọc dữ liệu, không side-effect state nghiệp vụ (ngoại lệ duy nhất: `GET /auth/verify-email`, xem ghi chú tại endpoint) | Có |
| `POST` | Tạo resource mới, hoặc thực hiện action/command (login, logout, đổi trạng thái...) | Tùy endpoint — nêu rõ ở từng mục |
| `PATCH` | Cập nhật một phần resource | Có (các PATCH trong spec này đều set giá trị field cụ thể, không phải "increment", nên lặp lại cùng input → cùng kết quả) |

Status code chuẩn dùng trong toàn bộ spec:
- `200 OK` — thành công, có body trả về (GET, PATCH, hoặc POST action không tạo resource mới).
- `201 Created` — POST tạo resource mới thành công (chỉ `register`).
- `400 Bad Request` — lỗi validation cú pháp/kiểu dữ liệu đầu vào.
- `401 Unauthorized` — chưa xác thực (không có session hợp lệ), HOẶC sai thông tin đăng nhập (dùng message chung theo yêu cầu bảo mật — xem 1.7).
- `403 Forbidden` — đã xác thực nhưng không đủ quyền (role không đủ, tài khoản bị khóa/chưa xác thực email).
- `404 Not Found` — resource không tồn tại (áp dụng cho các endpoint admin thao tác theo `{id}`).
- `409 Conflict` — request hợp lệ nhưng xung đột với trạng thái hiện tại của hệ thống (email đã tồn tại, token đã dùng, vi phạm last-admin rule, tài khoản đã deactivate).
- `410 Gone` — resource/token từng tồn tại nhưng đã hết hạn vĩnh viễn (link xác thực/reset hết hạn).
- `422 Unprocessable Entity` — request đúng cú pháp nhưng vi phạm business rule không thuộc nhóm "trạng thái xung đột" (mật khẩu hiện tại sai, mật khẩu mới trùng mật khẩu cũ, field không được phép sửa qua endpoint này).
- `429 Too Many Requests` — vượt rate-limit (brute-force login, spam đăng ký, spam resend/reset).
- `500 Internal Server Error` — lỗi hệ thống không lường trước; **không bao giờ** trả stack trace/chi tiết nội bộ trong body production.

### 1.4 Response envelope

**Thành công:**
```json
{
  "data": { "...": "resource hoặc kết quả action" },
  "message": "Thông điệp người dùng, optional — dùng cho action endpoint (login, logout, lock...)",
  "meta": { "...": "chỉ có ở list endpoint — xem 1.5 pagination" }
}
```
- `data` luôn có mặt (object, array, hoặc `null` nếu action không trả resource).
- `message` optional — chỉ thêm khi cần hiển thị thông báo xác nhận rõ ràng cho người dùng.
- `meta` chỉ xuất hiện ở response dạng danh sách.

**Lỗi (áp dụng cho MỌI mã lỗi 4xx/5xx):**
```json
{
  "error": {
    "code": "UPPER_SNAKE_CASE_CODE",
    "message": "Thông điệp người dùng, tiếng Việt, không lộ chi tiết hệ thống",
    "details": [
      { "field": "email", "issue": "INVALID_FORMAT" }
    ],
    "retryAfterSeconds": 900
  }
}
```
- `details`: optional, dùng cho `400`/`422` khi cần chỉ rõ field nào sai.
- `retryAfterSeconds`: optional, chỉ dùng cho `429` (đồng bộ với header `Retry-After`).
- `code` là định danh ổn định để client xử lý logic (switch-case), `message` chỉ để hiển thị — client KHÔNG được parse `message` để quyết định logic.

### 1.5 Pagination (bắt buộc cho mọi list endpoint)
- Offset-based qua query param: `?page=1&limit=20` (mặc định `page=1`, `limit=20`, `limit` tối đa `100`).
- *Giả định: chọn offset-based vì phù hợp UI quản trị (admin cần nhảy trang, hiển thị tổng số), không có yêu cầu cursor-based/real-time feed trong SRS.*
- `meta` trả kèm: `{ "page": 1, "limit": 20, "totalItems": 134, "totalPages": 7 }`.
- Filter dùng query param tên field trực tiếp: `?email=...` (không dùng cú pháp `filter[field]` vì hiện chỉ có 1 field filter, giữ đơn giản — sẽ chuẩn hóa lại nếu sau này có nhiều filter đồng thời).

### 1.6 Authentication (cookie session — theo ADR 0001)
- KHÔNG dùng `Authorization: Bearer <token>`. Client không tự quản lý token.
- Sau `POST /auth/login` thành công, server set cookie: tên `sid`, `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, `Max-Age=604800` (7 ngày, theo C-7).
- Mọi endpoint "authenticated" yêu cầu cookie `sid` hợp lệ còn hạn, tài khoản ở trạng thái cho phép hoạt động (không `LOCKED`/`DEACTIVATED`) — tra cứu session + trạng thái tài khoản mỗi request theo đúng quyết định ADR 0001 (không cache ở tầng JWT).
- **Lưu ý bảo mật quan trọng**: chuyển từ Bearer token sang cookie session làm phát sinh rủi ro CSRF (trình duyệt tự đính kèm cookie) mà mô hình Bearer token không có. `SameSite=Lax` (đã áp dụng ở mọi cookie) + cơ chế CSRF token riêng là bắt buộc cho mọi request state-changing (`POST`/`PATCH`) của Account module và Admin module. Cơ chế cụ thể **đã được chốt tại Low-Level Design Phase 2** (`docs/design/lld-phase2-rbac-account-admin.md`, mục "CSRF protection (C‑14)") — không còn để ngỏ cho implement tự quyết định như bản trước. Xem mục 1.6.1 cho response lỗi cụ thể.

### 1.6.1 Response lỗi CSRF (`CSRF_TOKEN_INVALID`)

Tóm tắt cơ chế đã chốt ở LLD Phase 2 (chi tiết kỹ thuật đầy đủ — class, luồng guard — xem file LLD, không lặp lại ở đây):
- **Cơ chế**: double-submit cookie dạng HMAC stateless. Server tự cấp/refresh cookie `csrfToken` (non-httpOnly để JS cùng-origin đọc được, `Secure`, `SameSite=Lax`, `Path=/`) trên MỌI response của route đã authenticate thuộc Account/Admin module (kể cả `GET`) — giá trị = `HMAC-SHA256(CSRF_SECRET, sessionId)`. Client không tự sinh token, chỉ cần echo đúng giá trị cookie đó vào header `X-CSRF-Token` khi gọi request state-changing.
- **Phạm vi áp dụng**: CHỈ các route `POST`/`PATCH` state-changing của **Account module** và **Admin module** (danh sách cụ thể: mục 4.2, 4.3, 4.4, 5.2, 5.3, 5.4). KHÔNG áp dụng cho route `GET` (không side-effect). KHÔNG áp dụng cho bất kỳ route nào của Auth module/Session module (Phase 1 — `register`, `login`, `logout`, `forgot-password`, `reset-password`, `verify-email`, `resend-verification`), vì các route đó đã triển khai xong ở Phase 1 và nằm ngoài phạm vi quyết định C‑14 của Phase 2.
- **Tình huống trả lỗi** (gộp chung 1 mã lỗi, không phân biệt chi tiết để tránh lộ thông tin cơ chế cho kẻ tấn công dò): thiếu cookie `csrfToken`, HOẶC thiếu header `X-CSRF-Token`, HOẶC 2 giá trị không khớp nhau (double-submit core check), HOẶC khớp nhau nhưng verify HMAC với session hiện tại thất bại (ví dụ cookie còn sót lại từ session cũ).

**Status code: `403 Forbidden`** (không dùng `401`) — tại thời điểm `CsrfGuard` chạy, request **đã có session hợp lệ** (`CsrfGuard` chạy sau `AuthGuard`, cần `authContext.sessionId` để verify theo thiết kế LLD). Đây không phải tình huống "chưa xác thực" (`401` dành riêng cho thiếu/sai session — mục 1.3/1.6), mà là "đã xác thực nhưng bị một lớp kiểm tra giao thức khác chặn lại" — nhất quán với cách `403 ACCOUNT_LOCKED`/`403 ACCOUNT_EMAIL_NOT_VERIFIED` đã dùng ở `POST /auth/login` cho các tình huống "đã xác định danh tính nhưng vẫn bị chặn vì lý do khác ngoài thiếu role".

**Request mẫu** (header thiếu hoặc không khớp cookie):
```
PATCH /api/v1/account/me
Cookie: sid=...; csrfToken=abc123...
X-CSRF-Token: (thiếu, hoặc giá trị khác abc123...)
```

**Response lỗi `403 Forbidden`**
```json
{
  "error": {
    "code": "CSRF_TOKEN_INVALID",
    "message": "Yêu cầu không hợp lệ (thiếu hoặc sai CSRF token)."
  }
}
```

Ghi chú:
- Client không cần tự quản lý vòng đời token — cookie `csrfToken` được server cấp/refresh tự động ngay từ request `GET` đầu tiên sau khi đăng nhập (ví dụ `GET /account/me`); client chỉ cần đọc cookie đó qua JS và echo vào header `X-CSRF-Token` cho mọi request state-changing tiếp theo.
- Không retry tự động khi gặp lỗi này — client cần đảm bảo đã gọi qua ít nhất 1 request `GET` của module đó để nhận cookie CSRF hợp lệ trước khi gọi lại request state-changing.
- Thứ tự guard khác nhau giữa 2 module (không ảnh hưởng tới response, chỉ ảnh hưởng độ ưu tiên khi nhiều lỗi cùng xảy ra): Account module chạy `CsrfGuard` ngay sau `AuthGuard` (trước kiểm tra nghiệp vụ field); Admin module chạy `RolesGuard` (403 `FORBIDDEN`) trước `CsrfGuard` — nghĩa là nếu người gọi vừa không đủ quyền ADMIN vừa thiếu CSRF token, response trả `403 FORBIDDEN` (lỗi phân quyền được kiểm tra trước).

### 1.7 Nguyên tắc chống lộ thông tin tài khoản (áp dụng xuyên suốt — theo SRS AC bảo mật)
- `POST /auth/login`: sai mật khẩu và tài khoản không tồn tại trả **cùng một `code`/`message`** (`401 AUTH_INVALID_CREDENTIALS`) — không được phân biệt.
- `POST /auth/forgot-password`: email tồn tại hay không đều trả **cùng một response `200`** với message chung.
- **Ngoại lệ đã được SRS xác nhận rõ ràng (không mâu thuẫn với 2 điểm trên)**: khi tài khoản **có tồn tại** nhưng đang ở trạng thái `LOCKED` (admin khóa) hoặc khóa tạm brute-force, hoặc `PENDING_VERIFICATION` (chưa xác thực email), `POST /auth/login` **được yêu cầu** trả thông báo cụ thể rõ ràng (REQ-AUTH-003 AC5, AC6) — đây là trade-off có chủ đích do stakeholder yêu cầu, khác với yêu cầu ẩn danh ở AC2/AC3. Thứ tự kiểm tra tại endpoint login (xem 1.7.1) được thiết kế để tuân thủ đúng cả hai yêu cầu cùng lúc.
- `POST /auth/register`: theo AC2, hành vi là **từ chối** (status lỗi, khác với forgot-password là luôn trả 200) nhưng **không tiết lộ chi tiết** khác (không nói tài khoản đó đã xác thực hay chưa, role gì...). *Diễn giải: đây là khác biệt có chủ đích giữa wording AC của register ("từ chối") và forgot-password ("phản hồi chung giống hệt") — nếu muốn register cũng ẩn danh hoàn toàn theo kiểu forgot-password (luôn trả 201 giả, gửi email cảnh báo "có người cố đăng ký lại email của bạn"), cần xác nhận lại với stakeholder vì khác với cách đọc literal của SRS hiện tại.*
- `POST /auth/resend-verification`: **mở rộng thêm** nguyên tắc ẩn danh tương tự forgot-password (luôn trả `200` chung, không phân biệt email tồn tại/đã xác thực/chưa xác thực) — đây là bổ sung của agent này ngoài yêu cầu literal trong SRS, áp dụng nhất quán triết lý chống dò email, cần xác nhận với stakeholder nếu muốn hành vi khác.

#### 1.7.1 Thứ tự kiểm tra tại `POST /auth/login` (quan trọng, quyết định hành vi bảo mật)
1. Email không tồn tại → `401 AUTH_INVALID_CREDENTIALS` (dừng, không kiểm tra tiếp).
2. Tài khoản tồn tại nhưng `status = LOCKED` hoặc đang trong cửa sổ khóa tạm brute-force (`lockedUntil > now`) → trả lỗi khóa tương ứng (mục 2.4), **không kiểm tra mật khẩu**.
3. Tài khoản tồn tại, không bị khóa, nhưng `status = PENDING_VERIFICATION` → `403 ACCOUNT_EMAIL_NOT_VERIFIED`, **không kiểm tra mật khẩu**.
4. Tài khoản `ACTIVE`, kiểm tra mật khẩu: sai → `401 AUTH_INVALID_CREDENTIALS` + tăng `failedLoginAttempts` (có thể dẫn tới khóa tạm ở lần sau); đúng → tạo session, trả `200`.

*Lưu ý: bước 2–3 về bản chất tiết lộ "tài khoản này tồn tại và đang ở trạng thái X" cho người gọi mà không cần biết mật khẩu đúng — đây là đánh đổi bảo mật được SRS yêu cầu tường minh (AC5, AC6), không phải sơ suất thiết kế. Ghi nhận rõ ở đây để `security-auditor` không hiểu nhầm là lỗi.*

### 1.8 Rate limiting
Mọi response `429` dùng chung format lỗi (1.4) + header `Retry-After: <seconds>`.

| Endpoint | Ngưỡng | Khóa theo | Nguồn yêu cầu |
|---|---|---|---|
| `POST /auth/login` | 5 lần sai liên tiếp / tài khoản → khóa tạm 15 phút | `email` (per-account) | C-5, NFR-002 |
| `POST /auth/register` | Rate-limit theo IP (ngưỡng cụ thể để cấu hình ở tầng hạ tầng, vd. 10 req/giờ/IP) | IP nguồn | C-6, NFR-003 |
| `POST /auth/resend-verification` | Rate-limit theo IP + email (bổ sung, chống spam gửi email tốn chi phí bên thứ ba) | IP + email | *Bổ sung ngoài SRS, khuyến nghị* |
| `POST /auth/forgot-password` | Rate-limit theo IP (bổ sung) | IP | *Bổ sung ngoài SRS, khuyến nghị* |
| `POST /auth/reset-password` | Rate-limit theo IP (chống brute-force đoán token, bổ sung) | IP | *Bổ sung ngoài SRS, khuyến nghị* |
| `GET /auth/verify-email` | Rate-limit nhẹ theo IP (chống brute-force đoán token, bổ sung) | IP | *Bổ sung ngoài SRS, khuyến nghị* |

*Các dòng đánh dấu "Bổ sung ngoài SRS" là đề xuất của agent này theo nguyên tắc thiết kế API an toàn (checklist mục 7), không phải yêu cầu literal trong SRS — cần stakeholder xác nhận có muốn áp dụng hay bỏ bớt.*

### 1.9 Enum & field dùng chung

**Role**: `USER` | `ADMIN`

**Account status** (field `status`, persistent, chỉ đổi bởi hành động rõ ràng):
- `PENDING_VERIFICATION` — mới đăng ký, chưa xác thực email.
- `ACTIVE` — hoạt động bình thường.
- `LOCKED` — bị ADMIN khóa thủ công (persistent, chỉ gỡ qua `unlock`).
- `DEACTIVATED` — tự vô hiệu hóa (soft-delete), KHÔNG có flow quay lại `ACTIVE` trong phạm vi giai đoạn 1 (xem mục "Ngoài phạm vi").

**Trường tạm thời tách riêng khỏi `status`** (brute-force lock, tự hết hạn, không phải hành động ADMIN):
- `failedLoginAttempts: number`
- `lockedUntil: string (ISO datetime) | null` — khi `lockedUntil > now`, login bị chặn dù `status = ACTIVE`.

*Giả định/diễn giải: SRS không tách rõ 2 khái niệm "khóa do ADMIN" và "khóa tạm do brute-force", nhưng bản chất vòng đời khác nhau (một cái cần ADMIN gỡ, một cái tự hết hạn) nên agent này tách thành `status=LOCKED` (ADMIN) và `lockedUntil` (brute-force) để tránh xung đột logic khi ADMIN unlock nhưng user vẫn đang trong cửa sổ khóa tạm, hoặc ngược lại.*

### 1.10 Validate input dùng chung
- `email`: string, bắt buộc, định dạng email hợp lệ (RFC 5322 cơ bản), tối đa 255 ký tự, **chuẩn hóa về lowercase + trim trước khi so khớp/lưu** để tránh bypass kiểm tra trùng email qua biến thể hoa/thường (bổ sung — chi tiết quan trọng không nêu rõ trong SRS nhưng cần thiết để AC2/REQ-AUTH-001 hoạt động đúng).
- `password` (mật khẩu mới ở mọi luồng — register/reset/change): string, tối thiểu 8 ký tự, tối đa 128 ký tự (giả định, chống DoS hash cost), phải chứa ít nhất 1 chữ cái và 1 chữ số (A-1 trong SRS — **lưu ý: A-1 là giả định của requirements-analyst, SRS ghi rõ cần stakeholder xác nhận chính thức trước khi code**, áp dụng tạm trong spec này).
- `id` (path param user id): UUID v4. *Giả định — SRS không chỉ định kiểu khóa chính, dùng UUID theo thông lệ phổ biến hiện đại; cần xác nhận với `data-modeler`.*
- `name`: string, optional, 1–100 ký tự sau khi trim nếu có mặt.

---

## 2. Auth module (public, trừ khi ghi chú khác)

### 2.1 `POST /api/v1/auth/register`
Đăng ký tài khoản mới bằng email/mật khẩu. Ai gọi: **public**.

**Request body**
```json
{
  "email": "user@example.com",
  "password": "Passw0rd123"
}
```
- `email`: required, xem 1.10.
- `password`: required, xem 1.10.
- *Giả định: form đăng ký KHÔNG thu thập `name` (SRS không đề cập), `name` để trống, cập nhật sau qua `PATCH /account/me`.*

**Response thành công `201 Created`**
```json
{
  "data": {
    "id": "c3f1e2a0-...-uuid",
    "email": "user@example.com",
    "role": "USER",
    "status": "PENDING_VERIFICATION",
    "createdAt": "2026-10-18T10:00:00Z"
  },
  "message": "Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản."
}
```

**Response lỗi**
| Status | code | Tình huống |
|---|---|---|
| 400 | `VALIDATION_ERROR` | email sai định dạng (AC4) hoặc password không đạt độ mạnh (AC3) |
| 409 | `EMAIL_ALREADY_REGISTERED` | email đã tồn tại (AC2) — message chung, không tiết lộ trạng thái/role tài khoản đó |
| 429 | `REGISTRATION_RATE_LIMITED` | vượt rate-limit theo IP (AC5, C-6) |
| 500 | `INTERNAL_ERROR` | lỗi hệ thống |

Ghi chú thiết kế: không idempotent theo nghĩa thông thường (gọi lại với cùng email lần 2 → `409`, đây là hành vi đúng của tạo resource có unique constraint, không cần idempotency key vì rủi ro trùng lặp ở đây là "tạo 2 tài khoản cùng email" vốn đã bị chặn bởi unique constraint, khác với rủi ro duplicate ở thanh toán/đơn hàng).

---

### 2.2 `GET /api/v1/auth/verify-email`
Xác thực email qua link trong email. Ai gọi: **public** (xác thực bằng token trong query, không cần session).

**Request**
- Query param: `token` (string, required, opaque token).

**Response thành công `200 OK`**
```json
{ "data": { "status": "VERIFIED", "email": "user@example.com" } }
```
hoặc (token hợp lệ nhưng tài khoản đã xác thực từ trước — AC3):
```json
{ "data": { "status": "ALREADY_VERIFIED", "email": "user@example.com" } }
```

**Response lỗi**
| Status | code | Tình huống |
|---|---|---|
| 400 | `VALIDATION_ERROR` | thiếu `token` hoặc sai định dạng |
| 400 | `TOKEN_INVALID` | token không khớp bất kỳ bản ghi nào (chưa từng phát hành/đã bị thay thế bởi lần resend mới hơn) |
| 410 | `TOKEN_EXPIRED` | token hợp lệ nhưng đã quá 24h (C-7, AC2) — gợi ý gọi `resend-verification` |
| 429 | `TOKEN_VERIFY_RATE_LIMITED` | rate-limit chống đoán token (bổ sung) |
| 500 | `INTERNAL_ERROR` | lỗi hệ thống |

Ghi chú thiết kế:
- **Phá vỡ nguyên tắc REST "GET phải an toàn/không side-effect"** một cách có chủ đích vì link trong email luôn là `GET`. Để giảm thiểu rủi ro, thiết kế endpoint **idempotent**: gọi lại cùng token đã dùng → vẫn `200 ALREADY_VERIFIED` (không lỗi), không gây hiệu ứng phụ không mong muốn khi người dùng bấm link 2 lần (ví dụ do preview link của mail client).
- Không bắt buộc xác thực — đây là luồng public theo token, nhưng cần rate-limit để chống brute-force đoán token (token phải đủ dài/random, thiết kế kỹ thuật chi tiết thuộc phạm vi implement).

---

### 2.3 `POST /api/v1/auth/resend-verification`
Gửi lại email xác thực. Ai gọi: **public**.

**Request body**
```json
{ "email": "user@example.com" }
```

**Response thành công `200 OK`** (LUÔN trả về cùng response bất kể email tồn tại/đã xác thực/chưa xác thực — xem 1.7)
```json
{ "message": "Nếu email tồn tại và chưa được xác thực, một email xác thực mới đã được gửi." }
```

**Response lỗi**
| Status | code | Tình huống |
|---|---|---|
| 400 | `VALIDATION_ERROR` | email sai định dạng/thiếu |
| 429 | `RESEND_VERIFICATION_RATE_LIMITED` | vượt rate-limit IP+email (bổ sung) |
| 500 | `INTERNAL_ERROR` | lỗi hệ thống |

---

### 2.4 `POST /api/v1/auth/login`
Đăng nhập bằng email/mật khẩu, tạo session cookie. Ai gọi: **public**.

**Request body**
```json
{ "email": "user@example.com", "password": "Passw0rd123" }
```

**Response thành công `200 OK`** (kèm `Set-Cookie: sid=...; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`)
```json
{
  "data": {
    "user": { "id": "uuid", "email": "user@example.com", "role": "USER" },
    "session": { "expiresAt": "2026-10-25T10:00:00Z" }
  }
}
```

**Response lỗi** (thứ tự kiểm tra — xem 1.7.1)
| Status | code | Tình huống |
|---|---|---|
| 400 | `VALIDATION_ERROR` | thiếu/sai định dạng `email`/`password` |
| 401 | `AUTH_INVALID_CREDENTIALS` | email không tồn tại (AC3) HOẶC mật khẩu sai (AC2) — **message giống hệt nhau, không phân biệt** |
| 403 | `ACCOUNT_LOCKED` | tài khoản bị ADMIN khóa (`status=LOCKED`) (AC5) |
| 403 | `ACCOUNT_EMAIL_NOT_VERIFIED` | tài khoản `PENDING_VERIFICATION` (AC6, C-1) |
| 429 | `ACCOUNT_TEMPORARILY_LOCKED` | đang trong cửa sổ khóa tạm brute-force (`lockedUntil > now`) — body kèm `retryAfterSeconds`, header `Retry-After` (C-5, AC4) |
| 500 | `INTERNAL_ERROR` | lỗi hệ thống |

Ghi chú thiết kế:
- Không idempotent theo nghĩa REST thuần (mỗi lần gọi thành công tạo 1 session mới) — chấp nhận được vì đây là hành vi login thông thường, không phải tạo resource rủi ro duplicate (không cần idempotency key).
- Bộ đếm `failedLoginAttempts` chỉ tăng ở nhánh "tài khoản tồn tại + sai mật khẩu" (bước 4 ở mục 1.7.1); không áp dụng cho email không tồn tại (không có bản ghi tài khoản để gắn bộ đếm) — khuyến nghị thêm lớp rate-limit theo IP ở tầng hạ tầng để bù rủi ro dò email hàng loạt từ 1 nguồn (bổ sung, xem 1.8).

---

### 2.5 `POST /api/v1/auth/forgot-password`
Yêu cầu gửi link đặt lại mật khẩu. Ai gọi: **public**.

**Request body**
```json
{ "email": "user@example.com" }
```

**Response thành công `200 OK`** (LUÔN cùng response bất kể email tồn tại hay không — AC1, AC2)
```json
{ "message": "Nếu email tồn tại trong hệ thống, một email đặt lại mật khẩu đã được gửi." }
```

**Response lỗi**
| Status | code | Tình huống |
|---|---|---|
| 400 | `VALIDATION_ERROR` | email sai định dạng/thiếu |
| 429 | `FORGOT_PASSWORD_RATE_LIMITED` | vượt rate-limit IP (bổ sung) |
| 500 | `INTERNAL_ERROR` | lỗi hệ thống |

---

### 2.6 `POST /api/v1/auth/reset-password`
Đặt lại mật khẩu bằng token từ email. Ai gọi: **public** (token-based).

**Request body**
```json
{ "token": "opaque-reset-token", "newPassword": "NewPassw0rd1" }
```

**Response thành công `200 OK`**
```json
{ "message": "Mật khẩu đã được đặt lại thành công. Vui lòng đăng nhập lại." }
```

**Response lỗi**
| Status | code | Tình huống |
|---|---|---|
| 400 | `VALIDATION_ERROR` | thiếu field, hoặc `newPassword` không đạt độ mạnh tối thiểu (AC5, nhánh "yếu") |
| 400 | `TOKEN_INVALID` | token không khớp bản ghi nào |
| 409 | `TOKEN_ALREADY_USED` | token đã được dùng trước đó (AC4) |
| 410 | `TOKEN_EXPIRED` | token quá 24h (AC4, C-7) |
| 422 | `PASSWORD_SAME_AS_OLD` | `newPassword` trùng mật khẩu hiện tại (AC5, nhánh "trùng") |
| 429 | `RESET_PASSWORD_RATE_LIMITED` | rate-limit chống đoán token (bổ sung) |
| 500 | `INTERNAL_ERROR` | lỗi hệ thống |

Ghi chú thiết kế: sau khi đổi mật khẩu thành công, **khuyến nghị thu hồi toàn bộ session hiện có** của tài khoản đó (phòng trường hợp mật khẩu bị lộ và có session cũ đang bị kẻ tấn công giữ) — bổ sung ngoài SRS, theo thông lệ bảo mật tốt, cần xác nhận với stakeholder nếu muốn giữ session hiện tại (nếu có) sống tiếp.

---

## 3. Session module (authenticated)

### 3.1 `POST /api/v1/auth/logout`
Kết thúc phiên đăng nhập hiện tại. Ai gọi: **authenticated** (USER hoặc ADMIN).

**Request**: không có body, chỉ cần cookie `sid` hợp lệ.

**Response thành công `200 OK`** (kèm `Set-Cookie: sid=; Max-Age=0` để xóa cookie phía client)
```json
{ "message": "Đã đăng xuất." }
```

**Response lỗi**
| Status | code | Tình huống |
|---|---|---|
| 401 | `UNAUTHENTICATED` | không có cookie `sid` hoặc session đã hết hạn/không hợp lệ |
| 500 | `INTERNAL_ERROR` | lỗi hệ thống |

Ghi chú thiết kế: Idempotent về mặt kết quả cuối (gọi 2 lần với cùng session → lần 2 session đã bị xóa nên trả `401`, đây là hành vi đúng theo REQ-SESSION-002 AC2 "session đã đăng xuất không được dùng lại").

---

## 4. Account module (authenticated, tự quản lý)

### 4.1 `GET /api/v1/account/me`
Xem thông tin tài khoản của chính mình. Ai gọi: **authenticated**.

**Response thành công `200 OK`**
```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Nguyễn Văn A",
    "role": "USER",
    "status": "ACTIVE",
    "emailVerifiedAt": "2026-10-10T08:00:00Z",
    "createdAt": "2026-10-01T00:00:00Z",
    "updatedAt": "2026-10-10T08:00:00Z"
  }
}
```
Không bao giờ trả `passwordHash` hoặc bất kỳ token nội bộ nào trong response này.

**Response lỗi**
| Status | code | Tình huống |
|---|---|---|
| 401 | `UNAUTHENTICATED` | không có session hợp lệ |
| 500 | `INTERNAL_ERROR` | lỗi hệ thống |

Ghi chú bảo mật (IDOR): endpoint không nhận `{id}` từ client — `id` lấy từ session hiện tại phía server, loại bỏ hoàn toàn rủi ro IDOR (không có cách nào truyền id người khác qua param).

---

### 4.2 `PATCH /api/v1/account/me`
Cập nhật thông tin cá nhân (chỉ `name`). Ai gọi: **authenticated**.

**Request body**
```json
{ "name": "Nguyễn Văn A" }
```
- Chỉ chấp nhận field `name`. Nếu body chứa `email` hoặc `role` → từ chối rõ ràng (AC3).

**Response thành công `200 OK`**
```json
{ "data": { "id": "uuid", "email": "user@example.com", "name": "Nguyễn Văn A", "role": "USER", "status": "ACTIVE" } }
```

**Response lỗi**
| Status | code | Tình huống |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `name` sai kiểu/độ dài ngoài 1–100 ký tự |
| 401 | `UNAUTHENTICATED` | không có session hợp lệ |
| 403 | `CSRF_TOKEN_INVALID` | thiếu/sai cookie `csrfToken` hoặc header `X-CSRF-Token` (xem 1.6.1) |
| 422 | `FIELD_NOT_EDITABLE` | body chứa `email` hoặc `role` — `details: [{ "field": "email", "issue": "NOT_EDITABLE_VIA_THIS_ENDPOINT" }]` (AC3) |
| 500 | `INTERNAL_ERROR` | lỗi hệ thống |

---

### 4.3 `POST /api/v1/account/change-password`
Đổi mật khẩu khi đã biết mật khẩu hiện tại. Ai gọi: **authenticated**.

**Request body**
```json
{ "currentPassword": "OldPassw0rd1", "newPassword": "NewPassw0rd1" }
```

**Response thành công `200 OK`**
```json
{ "message": "Đổi mật khẩu thành công." }
```

**Response lỗi**
| Status | code | Tình huống |
|---|---|---|
| 400 | `VALIDATION_ERROR` | thiếu field, hoặc `newPassword` không đạt độ mạnh tối thiểu (AC3 nhánh "yếu") |
| 401 | `UNAUTHENTICATED` | không có session hợp lệ |
| 403 | `CSRF_TOKEN_INVALID` | thiếu/sai cookie `csrfToken` hoặc header `X-CSRF-Token` (xem 1.6.1) |
| 422 | `CURRENT_PASSWORD_INCORRECT` | `currentPassword` sai (AC2) |
| 422 | `PASSWORD_SAME_AS_OLD` | `newPassword` trùng `currentPassword` (AC3 nhánh "trùng") |
| 500 | `INTERNAL_ERROR` | lỗi hệ thống |

---

### 4.4 `POST /api/v1/account/deactivate`
Tự vô hiệu hóa tài khoản (soft-delete). Ai gọi: **authenticated**.

**Request body**
```json
{ "password": "CurrentPassw0rd1" }
```
- Yêu cầu nhập lại mật khẩu để xác nhận hành động không thể đảo ngược trong phạm vi giai đoạn 1 (AC1).

**Response thành công `200 OK`** (kèm `Set-Cookie: sid=; Max-Age=0` để kết thúc session hiện tại — AC1)
```json
{ "message": "Tài khoản đã được vô hiệu hóa." }
```

**Response lỗi**
| Status | code | Tình huống |
|---|---|---|
| 400 | `VALIDATION_ERROR` | thiếu `password` |
| 401 | `UNAUTHENTICATED` | không có session hợp lệ |
| 403 | `CSRF_TOKEN_INVALID` | thiếu/sai cookie `csrfToken` hoặc header `X-CSRF-Token` (xem 1.6.1) |
| 422 | `CURRENT_PASSWORD_INCORRECT` | mật khẩu xác nhận sai |
| 409 | `LAST_ADMIN_RULE_VIOLATION` | người gọi là ADMIN duy nhất còn lại trong hệ thống (AC3, C-3) |
| 500 | `INTERNAL_ERROR` | lỗi hệ thống |

Ghi chú thiết kế: sau khi `DEACTIVATED`, không có endpoint nào trong phạm vi giai đoạn 1 để tự kích hoạt lại (xem mục "Ngoài phạm vi").

---

## 5. Admin module (chỉ ADMIN)

Mọi endpoint dưới đây yêu cầu: có session hợp lệ (`401` nếu không) **và** `role = ADMIN` (`403 FORBIDDEN` nếu không đủ quyền — AC3 của REQ-ADMIN-001).

### 5.1 `GET /api/v1/admin/users`
Xem/tìm kiếm danh sách người dùng. Ai gọi: **ADMIN**.

**Query param**
- `page`: integer, optional, default `1`, min `1`.
- `limit`: integer, optional, default `20`, max `100`.
- `email`: string, optional — tìm kiếm theo substring, không phân biệt hoa/thường (AC2).

**Response thành công `200 OK`**
```json
{
  "data": [
    { "id": "uuid-1", "email": "a@example.com", "role": "USER", "status": "ACTIVE", "createdAt": "2026-10-01T00:00:00Z" },
    { "id": "uuid-2", "email": "admin@example.com", "role": "ADMIN", "status": "ACTIVE", "createdAt": "2026-09-01T00:00:00Z" }
  ],
  "meta": { "page": 1, "limit": 20, "totalItems": 134, "totalPages": 7 }
}
```
Trường tối thiểu theo AC1: `email`, `role`, `status`. Không bao giờ trả `passwordHash`.

**Response lỗi**
| Status | code | Tình huống |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `page`/`limit` không hợp lệ (âm, không phải số, `limit` > 100) |
| 401 | `UNAUTHENTICATED` | không có session hợp lệ |
| 403 | `FORBIDDEN` | người gọi role `USER` (AC3) |
| 500 | `INTERNAL_ERROR` | lỗi hệ thống |

---

### 5.2 `POST /api/v1/admin/users/{id}/lock`
Khóa tài khoản người dùng khác (hoặc chính mình, nếu không vi phạm last-admin rule). Ai gọi: **ADMIN**.

**Path param**: `id` — UUID của tài khoản mục tiêu.

**Response thành công `200 OK`**
```json
{ "data": { "id": "uuid", "status": "LOCKED" }, "message": "Tài khoản đã bị khóa. Mọi phiên đăng nhập hiện tại đã bị thu hồi." }
```
Idempotent: nếu tài khoản mục tiêu đã `LOCKED` từ trước → vẫn `200 OK`, không lỗi.

**Response lỗi**
| Status | code | Tình huống |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `id` không đúng định dạng UUID |
| 401 | `UNAUTHENTICATED` | không có session hợp lệ |
| 403 | `FORBIDDEN` | người gọi role `USER` |
| 403 | `CSRF_TOKEN_INVALID` | thiếu/sai cookie `csrfToken` hoặc header `X-CSRF-Token` — chỉ kiểm tra sau khi đã qua `FORBIDDEN` ở trên (xem 1.6.1) |
| 404 | `USER_NOT_FOUND` | không tìm thấy tài khoản với `id` đó |
| 409 | `CONFLICT_ACCOUNT_DEACTIVATED` | tài khoản mục tiêu đã `DEACTIVATED` (soft-delete), không áp dụng khóa lên tài khoản đã vô hiệu hóa |
| 409 | `LAST_ADMIN_RULE_VIOLATION` | khóa tài khoản này sẽ khiến hệ thống không còn ADMIN nào đang hoạt động (C-3; bao gồm cả trường hợp tự khóa chính mình khi là ADMIN duy nhất — AC3) |
| 500 | `INTERNAL_ERROR` | lỗi hệ thống |

Ghi chú thiết kế:
- **Diễn giải mở rộng last-admin rule**: SRS (REQ-ADMIN-002 AC3) chỉ nêu literal trường hợp "ADMIN tự khóa chính mình". Agent này áp dụng quy tắc tổng quát hơn theo đúng tinh thần ràng buộc C-3 ("chặn MỌI hành động khiến hệ thống không còn ADMIN nào") — tức là chặn khóa bất kỳ ADMIN nào nếu đó là ADMIN đang hoạt động cuối cùng, không chỉ giới hạn ở self-lock. Cần xác nhận với stakeholder nếu muốn giới hạn lại đúng literal AC3 (chỉ chặn self-lock).
- Side-effect bắt buộc theo ADR 0001: thao tác khóa + thu hồi toàn bộ session hiện có của tài khoản đó phải nằm trong cùng 1 transaction Postgres.

---

### 5.3 `POST /api/v1/admin/users/{id}/unlock`
Mở khóa tài khoản. Ai gọi: **ADMIN**.

**Path param**: `id` — UUID tài khoản mục tiêu.

**Response thành công `200 OK`**
```json
{ "data": { "id": "uuid", "status": "ACTIVE" }, "message": "Tài khoản đã được mở khóa." }
```
Idempotent: nếu tài khoản đã `ACTIVE` → vẫn `200 OK`.

**Response lỗi**
| Status | code | Tình huống |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `id` sai định dạng UUID |
| 401 | `UNAUTHENTICATED` | không có session hợp lệ |
| 403 | `FORBIDDEN` | người gọi role `USER` |
| 403 | `CSRF_TOKEN_INVALID` | thiếu/sai cookie `csrfToken` hoặc header `X-CSRF-Token` — chỉ kiểm tra sau khi đã qua `FORBIDDEN` ở trên (xem 1.6.1) |
| 404 | `USER_NOT_FOUND` | không tìm thấy tài khoản |
| 409 | `CONFLICT_ACCOUNT_DEACTIVATED` | tài khoản mục tiêu đã `DEACTIVATED` — SRS giai đoạn 1 không định nghĩa flow "kích hoạt lại" tài khoản đã soft-delete, nên `unlock` không áp dụng lên `DEACTIVATED` (xem mục "Ngoài phạm vi") |
| 500 | `INTERNAL_ERROR` | lỗi hệ thống |

---

### 5.4 `PATCH /api/v1/admin/users/{id}/role`
Gán/thay đổi vai trò người dùng. Ai gọi: **ADMIN**.

**Path param**: `id` — UUID tài khoản mục tiêu.

**Request body**
```json
{ "role": "ADMIN" }
```
- `role`: required, enum `"USER" | "ADMIN"`.

**Response thành công `200 OK`**
```json
{ "data": { "id": "uuid", "role": "ADMIN" } }
```
Idempotent: nếu `role` gửi lên trùng role hiện tại → vẫn `200 OK`, không lỗi (PATCH set-giá-trị, không phải increment).

**Response lỗi**
| Status | code | Tình huống |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `role` thiếu hoặc không thuộc enum `{USER, ADMIN}` |
| 401 | `UNAUTHENTICATED` | không có session hợp lệ |
| 403 | `FORBIDDEN` | người gọi role `USER` |
| 403 | `CSRF_TOKEN_INVALID` | thiếu/sai cookie `csrfToken` hoặc header `X-CSRF-Token` — chỉ kiểm tra sau khi đã qua `FORBIDDEN` ở trên (xem 1.6.1) |
| 404 | `USER_NOT_FOUND` | không tìm thấy tài khoản |
| 409 | `CONFLICT_ACCOUNT_DEACTIVATED` | tài khoản mục tiêu đã `DEACTIVATED` |
| 409 | `LAST_ADMIN_RULE_VIOLATION` | hạ cấp `ADMIN → USER` sẽ khiến hệ thống không còn ADMIN nào — áp dụng cho cả tự hạ cấp (AC2) và hạ cấp ADMIN khác (AC3) |
| 500 | `INTERNAL_ERROR` | lỗi hệ thống |

Ghi chú thiết kế quan trọng (đồng bộ với session design — ADR 0001): theo REQ-ADMIN-003 AC1, thay đổi vai trò **chỉ có hiệu lực ở phiên đăng nhập tiếp theo** của người dùng bị đổi — nghĩa là session đang hoạt động của họ (nếu có) vẫn giữ role cũ cho tới khi họ đăng nhập lại. Hệ quả kỹ thuật: bản ghi session nên lưu snapshot `role` tại thời điểm tạo session (không join real-time bảng `users.role` mỗi request), khác với cách xử lý `status` (luôn tra cứu real-time theo ADR 0001 để đáp ứng REQ-SESSION-001 AC3/REQ-ADMIN-002 AC1). Đây là điểm cần đối chiếu kỹ với thiết kế bảng `sessions` của `data-modeler`.

---

## 6. Checklist thiết kế API tốt

- **Idempotency**: `PATCH /account/me`, `PATCH /admin/users/{id}/role` idempotent theo thiết kế (set-value, không increment). `POST /admin/users/{id}/lock|unlock` được thiết kế idempotent có chủ đích (gọi lặp lại không lỗi). `POST /auth/register` không idempotent nhưng an toàn nhờ unique constraint trả `409` rõ ràng — không cần idempotency key vì rủi ro duplicate ở đây khác bản chất với thanh toán/đặt hàng.
- **Pagination**: đã thiết kế cho endpoint list duy nhất (`GET /admin/users`) — offset-based, có `meta.totalItems/totalPages`. Không có list endpoint nào khác trong phạm vi.
- **N+1 (GraphQL)**: không áp dụng — toàn bộ spec này là REST.
- **Over-fetching/exposure**: `passwordHash` không xuất hiện ở bất kỳ response nào (kể cả `GET /account/me`, `GET /admin/users`). Token xác thực email/reset password là opaque, chỉ dùng một lần, không trả lại trong bất kỳ response GET nào ngoài lúc gửi qua email.
- **Error case đầy đủ**: mỗi endpoint đã liệt kê đủ 400/401/403/404/409/422/429/500 phù hợp ngữ cảnh (không phải endpoint nào cũng cần đủ tất cả — chỉ áp dụng mã lỗi có khả năng xảy ra thực tế theo nghiệp vụ).

## 7. Bảo mật cần lưu ý khi implement

- **Xác thực (401)**: áp dụng cho toàn bộ `Session`, `Account`, `Admin` module. `Auth` module (trừ `logout`) là public theo đúng bản chất (chưa đăng nhập mới cần các luồng này).
- **Phân quyền (403)**: `Admin` module yêu cầu `role=ADMIN` nghiêm ngặt. `Account` module không có phân quyền theo role nhưng có kiểm soát sở hữu (xem IDOR bên dưới). `Auth/login` có 2 mã `403` đặc thù (`ACCOUNT_LOCKED`, `ACCOUNT_EMAIL_NOT_VERIFIED`) — đây là chặn truy cập do trạng thái tài khoản, không phải thiếu role.
- **Nguy cơ IDOR**:
  - `GET/PATCH /account/me`, `POST /account/change-password`, `POST /account/deactivate`: **không nhận `id` từ client**, luôn thao tác trên tài khoản gắn với session hiện tại → loại bỏ IDOR hoàn toàn ở nhóm endpoint này.
  - `POST /admin/users/{id}/lock|unlock`, `PATCH /admin/users/{id}/role`: nhận `id` trực tiếp từ path — đây LÀ điểm cần kiểm tra IDOR, nhưng vì được giới hạn bởi `role=ADMIN` (không phải self-service của USER thường) nên rủi ro được giảm thiểu ở tầng phân quyền; vẫn cần đảm bảo `404 USER_NOT_FOUND` trả về nhất quán (không phân biệt "không tồn tại" và "tồn tại nhưng không thuộc phạm vi quản lý", vì giai đoạn 1 là single-tenant, A-5, nên không có khái niệm "user thuộc tenant khác" cần che giấu thêm).
- **Rate limiting**: bắt buộc cho `login` (C-5) và `register` (C-6); khuyến nghị thêm cho `resend-verification`, `forgot-password`, `reset-password`, `verify-email` (mục 1.8) vì đều là endpoint public, tốn tài nguyên gửi email bên thứ ba (C-8) hoặc có bề mặt brute-force token.
- **Password hashing**: `NFR-001` — không bao giờ lưu/hiển thị plaintext; tầng implement phải dùng thuật toán hash chậm, có salt (bcrypt/argon2) — nằm ngoài phạm vi API contract nhưng ảnh hưởng trực tiếp tới `maxLength=128` của `password` (giới hạn input hash cost).
- **CSRF**: xem mục 1.6/1.6.1 — cơ chế double-submit cookie HMAC stateless đã chốt tại LLD Phase 2 (`docs/design/lld-phase2-rbac-account-admin.md`), áp dụng cho mọi route state-changing của Account/Admin module, mã lỗi `CSRF_TOKEN_INVALID` (403).

## Giả định đã đưa ra (tổng hợp)
- Versioning qua URL path `/api/v1` (mục 1.1).
- Pagination offset-based `page`/`limit` cho `GET /admin/users` (mục 1.5).
- `register` không thu thập `name`; `name` cập nhật sau qua `PATCH /account/me`.
- `id` của user là UUID v4 (cần xác nhận với `data-modeler`).
- Email chuẩn hóa lowercase + trim trước khi check trùng/so khớp (mục 1.10).
- Độ mạnh mật khẩu theo A-1 của SRS (SRS tự ghi nhận đây là giả định của requirements-analyst, CHƯA được stakeholder xác nhận chính thức — spec này áp dụng tạm, cần chốt lại trước khi code).
- Tách `status=LOCKED` (ADMIN khóa, persistent) khỏi `lockedUntil` (brute-force, tự hết hạn) — SRS không tách rõ, agent tự suy luận từ bản chất vòng đời khác nhau.
- Mở rộng last-admin rule tổng quát hơn literal AC3 của REQ-ADMIN-002 (chặn khóa bất kỳ ADMIN cuối cùng nào, không chỉ self-lock) — theo tinh thần C-3.
- `resend-verification` áp dụng nguyên tắc ẩn danh (luôn 200 chung) dù SRS không nêu rõ — mở rộng triết lý chống dò email từ `forgot-password`.
- Thêm rate-limit cho `resend-verification`/`forgot-password`/`reset-password`/`verify-email` ngoài 2 ngưỡng bắt buộc C-5/C-6.
- Sau `reset-password` thành công, khuyến nghị thu hồi toàn bộ session hiện có của tài khoản (không có trong SRS).

## Ngoài phạm vi / cần xác nhận thêm
- **Flow kích hoạt lại tài khoản đã `DEACTIVATED`**: SRS (C-2, Out of Scope 5.2 "hard-delete") không đề cập có cho phép tài khoản tự vô hiệu hóa quay lại `ACTIVE` hay không. Spec này giả định KHÔNG có flow này trong giai đoạn 1 (vĩnh viễn `DEACTIVATED` trừ can thiệp DB thủ công). Nếu nghiệp vụ cần một flow "ADMIN khôi phục tài khoản đã deactivate", đây là endpoint mới ngoài 14 endpoint được giao — cần xác nhận có muốn thiết kế thêm không.
- **Admin tạo tài khoản trực tiếp** (không qua luồng đăng ký công khai, ví dụ ADMIN tạo tài khoản cho người dùng nội bộ): không có trong danh sách yêu cầu, không thiết kế thêm trừ khi được yêu cầu.
- **Xem chi tiết 1 user cụ thể** (`GET /admin/users/{id}`): không có trong danh sách 14 endpoint được giao (chỉ có list + search), không thiết kế thêm.

## File đã tạo
- `D:\MyStartUp\Multi-user-System\docs\design\api-spec-multi-user-system.md` — toàn bộ nội dung bản thiết kế trên. LƯU Ý: đây là spec/design draft, CHƯA phải code triển khai (không có route handler/controller/middleware thật nào được viết).
</content>
