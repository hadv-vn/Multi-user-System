# Threat Model: Module nền tảng Auth + RBAC — Multi-User System (Giai đoạn 1)

## Phạm vi đã phân tích
- 4 luồng nghiệp vụ: (1) Đăng ký + xác thực email, (2) Đăng nhập + quản lý
  session (cookie httpOnly, chống brute-force), (3) Quên/đặt lại mật khẩu
  qua email, (4) Admin khóa/mở khóa tài khoản + đổi vai trò (last-admin
  rule, race condition).
- Trust boundary: Client (trình duyệt) ↔ Backend NestJS (Modular Monolith)
  ↔ PostgreSQL ↔ SMTP Provider bên thứ ba.
- Nguồn thiết kế: SRS v1.0, ADR-0001 (Accepted), data-model, api-spec
  (draft), HLD, LLD Phase 1 — đã đọc trực tiếp trong repo.
- Trạng thái code: repo chưa có code (chỉ tài liệu thiết kế) — đây là
  threat modeling ở bước thiết kế, trước khi viết code.

## Thành phần & Trust Boundary
- **Actor/External entity**: Khách vãng lai (chưa đăng nhập), USER đã đăng
  nhập, ADMIN đã đăng nhập, SMTP Provider bên thứ ba (SendGrid/SES).
- **Process**: Frontend Next.js (thin client); AuthController/AuthService;
  SessionService/AuthGuard; RbacModule (RolesGuard + LastAdminPolicyService,
  Phase 2); AccountModule (Phase 2); AdminModule (Phase 2);
  EmailModule/NodemailerSmtpSender; CommonModule (IPasswordHasher,
  IRateLimiter in-memory).
- **Data store**: PostgreSQL (`users`, `roles`, `user_roles`, `sessions`,
  `email_verification_tokens`, `password_reset_tokens`); bộ đếm rate-limit
  in-memory (ephemeral, chỉ đúng với 1 instance backend).
- **Trust boundary**:
  - TB1: Browser (internet, không tin cậy) ↔ Backend NestJS — qua
    REST/HTTPS, cookie `sid`.
  - TB2: Request ẩn danh (public) ↔ Request đã xác thực (session hợp lệ) —
    kiểm soát bởi `AuthGuard`.
  - TB3: Quyền USER ↔ Quyền ADMIN — kiểm soát bởi `RolesGuard` +
    `role_snapshot` trên session.
  - TB4: Backend NestJS ↔ PostgreSQL — qua Prisma.
  - TB5: Backend NestJS (EmailModule) ↔ SMTP Provider bên thứ ba — qua
    internet công khai.

## Data Flow Diagram (dạng text)
1. Client → AuthService: `POST /auth/register {email, password}`, qua TB1.
2. AuthService → PostgreSQL: ghi `users` (PENDING_VERIFICATION) +
   `user_roles(USER)`, qua TB4.
3. AuthService → EmailModule → SMTP Provider: gửi email xác thực, qua TB5.
4. Client (bấm link) → AuthService: `GET /auth/verify-email?token=...`, qua TB1.
5. AuthService → PostgreSQL: đối chiếu `token_hash`, set `email_verified_at`, qua TB4.
6. Client → AuthService: `POST /auth/login {email, password}`, qua TB1.
7. AuthService → PostgreSQL: tra `users`, kiểm tra status/lockedUntil, verify password hash, qua TB4.
8. AuthService → SessionService → PostgreSQL: tạo `sessions` (kèm `role_snapshot`), qua TB4.
9. AuthService → Client: `Set-Cookie sid; HttpOnly; Secure; SameSite=Lax`, qua TB1.
10. Client (cookie `sid`) → AuthGuard: tra session + `user.status` real-time, qua TB4 + TB2.
11. Client → AuthService: `POST /auth/forgot-password {email}`, qua TB1.
12. AuthService → PostgreSQL: tạo `password_reset_tokens` (hash, 24h), qua TB4.
13. AuthService → EmailModule → SMTP Provider: gửi email reset, qua TB5.
14. Client → AuthService: `POST /auth/reset-password {token, newPassword}`, qua TB1.
15. AuthService → PostgreSQL: đối chiếu token, cập nhật `password_hash`, revoke toàn bộ session, qua TB4.
16. Client (ADMIN) → AdminModule: `POST /admin/users/{id}/lock|unlock`, qua TB1 + TB3.
17. AdminModule → RbacModule.LastAdminPolicyService → PostgreSQL: transaction `SELECT...FOR UPDATE`, qua TB4.
18. AdminModule + SessionModule → PostgreSQL (cùng transaction): cập nhật `users.status` + revoke toàn bộ session user mục tiêu, qua TB4.
19. Client (ADMIN) → AdminModule: `PATCH /admin/users/{id}/role`, qua TB1 + TB3.
20. AdminModule → RbacModule.LastAdminPolicyService → PostgreSQL: transaction `FOR UPDATE`, cập nhật `user_roles`, qua TB4.

## Phân tích STRIDE

### Luồng 1: Đăng ký tài khoản
- **Spoofing**: Rate-limit theo IP có thể bị bypass qua xoay vòng IP/proxy → T1.
- **Information Disclosure**: `409 EMAIL_ALREADY_REGISTERED` cho phép dò email đã tồn tại → T2.
- **Denial of Service**: `resend-verification` có thể bị lạm dụng để spam email (email bombing) → T3.
- **Elevation of Privilege**: Không áp dụng — role luôn hard-code `USER`.

### Luồng 1b: Xác thực email
- Rủi ro thấp nói chung — token entropy cao, chỉ gắn với đúng 1 user cố định.
- Thuộc cùng nhóm rate-limit T3.

### Luồng 2: Đăng nhập + chống brute-force
- **Spoofing**: Thiếu rate-limit theo IP cho login (chỉ có per-account C-5) → credential stuffing trải rộng nhiều tài khoản → **T6 (Critical)**.
- **Tampering**: `registerFailedLoginAttempt` atomic increment — ĐÃ CÓ biện pháp.
- **Information Disclosure**: Message `AUTH_INVALID_CREDENTIALS` gộp đúng 2 nhánh — đủ ở kênh body/status. Nhưng timing attack qua chênh lệch thời gian bcrypt.verify() → **T5 (Medium)**.
- **Elevation of Privilege**: Không áp dụng ở chính luồng login.

### Luồng 2b: Quản lý session
- **Tampering**: `sessions.id` lưu plaintext (ADR-0001) — nếu DB lộ, dùng được ngay → **T7 (Medium)**.
- Các mục khác đã có biện pháp (HttpOnly/Secure, không log session_id, revoke khi logout).

### Luồng 3: Quên/đặt lại mật khẩu
- Thiết kế ẩn danh hoàn toàn ở `forgot-password` — ĐÚNG và ĐỦ.
- Revoke toàn bộ session sau khi reset — ĐÃ CÓ biện pháp tốt.
- Rate-limit thuộc nhóm T3.

### Luồng 4: Admin khóa/mở khóa tài khoản
- **Tampering**: Khóa + revoke session cùng 1 transaction — ĐÃ CÓ biện pháp.
- **Repudiation**: Không ghi nhận actor (ADMIN nào khóa, lúc nào) → **T9 (High)**.
- **Denial of Service**: ADMIN compromise có thể spam khóa hàng loạt → **T10 (Medium)**.
- **Elevation of Privilege**: Last-admin rule đã mở rộng đúng (C-10) — ĐÃ CÓ biện pháp.

### Luồng 4b: Admin đổi vai trò + last-admin rule
- **Tampering — race condition**: ĐÃ CÓ biện pháp (`SELECT...FOR UPDATE`) → **T11 (Medium, rủi ro còn lại thấp)**.
- **Repudiation**: cùng nhóm T9.
- **Elevation of Privilege — nghiêm trọng**: Role là snapshot (C-11), khi hạ cấp một ADMIN, session đang hoạt động của họ KHÔNG bị revoke → ADMIN vừa bị hạ cấp vẫn dùng được quyền ADMIN cũ tới 7 ngày → **T8 (High)**.

### EmailModule ↔ SMTP Provider (TB5)
- **Spoofing/Information Disclosure**: Secret SMTP "chưa xác định" cơ chế quản lý → **T13 (High)**.
- Token trong link email: đã giảm thiểu bằng entropy cao + hết hạn 24h + một lần dùng + lưu hash — ĐÃ CÓ biện pháp hợp lý.

## Danh sách threat theo mức rủi ro

**[Critical] T6 — Spoofing — Đăng nhập thiếu rate-limit theo IP**
Thiếu rate-limit theo IP cho `POST /auth/login` cho phép credential stuffing trải rộng nhiều tài khoản từ cùng một nguồn mà không chạm ngưỡng per-account (C-5).
Likelihood: Cao. Impact: Cao (chiếm tài khoản, có thể là ADMIN).
Đề xuất: Bổ sung rate-limit theo IP độc lập (song song với per-account) cho `POST /auth/login` — xử lý ở **Phase 1**.

**[High] T3 — Denial of Service — Thiếu rate-limit sớm cho 4 endpoint public nhạy cảm**
`resend-verification`/`forgot-password`/`reset-password`/`verify-email` không có rate-limit cho tới Phase 3 theo HLD, tạo khoảng trống nếu go-live Phase 1/2 trước Phase 3.
Likelihood: Cao nếu theo đúng thứ tự phase không điều chỉnh. Impact: Trung bình (chi phí SMTP, email-bombing).
Đề xuất: Kéo rate-limit cơ bản (IP/IP+email) cho 4 endpoint này sớm lên **Phase 1**, cùng nhóm với T6; giữ hardening nâng cao (CAPTCHA) ở Phase 3.

**[High] T4 — Spoofing/Tampering (CSRF) — Thiếu CSRF token cho endpoint state-changing dùng cookie**
`logout`, `change-password`, `deactivate`, `admin/users/{id}/lock|unlock|role` chỉ có SameSite=Lax, chưa có CSRF token (double-submit/`X-CSRF-Token`), dự kiến Phase 3.
Likelihood: Trung bình. Impact: Cao (đặc biệt `admin/.../role` có thể ép ADMIN tự đổi role/khóa tài khoản ngoài ý muốn).
Đề xuất: Cân nhắc kéo sớm lên **Phase 2** (tối thiểu cho AdminModule + AccountModule).

**[High] T8 — Elevation of Privilege — Hạ cấp ADMIN không revoke session**
Session đang hoạt động của ADMIN bị hạ cấp KHÔNG bị revoke (role là snapshot, C-11) → ADMIN vừa bị hạ cấp vẫn dùng được quyền ADMIN cũ (kể cả tự gán lại ADMIN) tới khi session hết hạn (tối đa 7 ngày).
Likelihood: Trung bình (đúng kịch bản REQ-ADMIN-003 được tạo ra để xử lý — hạ cấp ADMIN bị nghi ngờ). Impact: Cao (vô hiệu hóa hoàn toàn mục đích bảo mật của hành động hạ cấp).
Đề xuất: BẮT BUỘC revoke toàn bộ session khi HẠ CẤP một ADMIN (giữ nguyên "áp dụng ở phiên tiếp theo" cho THĂNG cấp). Cần xác nhận lại trước khi Phase 2 code `AdminModule.changeRole()`.

**[High] T9 — Repudiation — Không ghi nhận actor cho hành động Admin**
Không có cột/bảng ghi actor (ADMIN nào khóa/đổi role, lúc nào) cho hành động quản trị nhạy cảm nhất hệ thống.
Likelihood: Trung bình. Impact: Cao (không có khả năng forensic nếu bị lạm dụng).
Đề xuất: Bổ sung tối thiểu cột/bảng actor (`performed_by_admin_id` hoặc bảng `admin_action_log` tối giản) ngay khi `AdminModule` thiết kế ở **Phase 2** — dữ liệu actor cần ghi ngay từ đầu vì không thể bổ sung hồi tố.

**[High] T13 — Information Disclosure/Spoofing — Quản lý secret SMTP chưa xác định**
Cơ chế bảo vệ secret SMTP (API key/credential) "chưa xác định".
Likelihood: Trung bình. Impact: Cao (phishing dưới danh nghĩa hệ thống, rủi ro domain bị blacklist ảnh hưởng chức năng xác thực email bắt buộc C-1).
Đề xuất: Secret qua biến môi trường/secret manager (không hardcode/commit), API key giới hạn quyền tối thiểu. Chốt **trước Phase 1**.

**[Medium] T2 — Information Disclosure — Email enumeration qua đăng ký**
`409 EMAIL_ALREADY_REGISTERED` cho phép dò email đã đăng ký, khác hành vi ẩn danh của `forgot-password`.
Likelihood: Cao. Impact: Thấp-Trung bình.
Ghi chú: Đây là thiết kế CHỦ ĐÍCH theo đúng literal AC2 của SRS (đã chốt với stakeholder) — không phải thiếu sót. Ghi nhận lại, không bắt buộc đổi.

**[Medium] T5 — Information Disclosure — Timing attack khi đăng nhập**
Nhánh "email không tồn tại" trả lỗi ngay, nhánh "sai mật khẩu" chạy bcrypt tốn thời gian → chênh lệch thời gian phản hồi đo được.
Likelihood: Trung bình. Impact: Trung bình (chỉ xác nhận email tồn tại).
Đề xuất: Khi email không tồn tại, vẫn verify với dummy hash cùng cost factor trước khi trả lỗi, để cân bằng thời gian phản hồi. Bổ sung vào `AuthService.login()` **ngay ở Phase 1**.

**[Medium] T7 — Tampering — session.id lưu plaintext**
Theo ADR-0001; nếu DB lộ, session_id dùng được ngay để chiếm tài khoản đang hoạt động.
Likelihood: Thấp (cần DB bị lộ trước). Impact: Cao nếu xảy ra.
Đề xuất: KHÔNG lật ngược ADR-0001. Bổ sung mã hoá at-rest cho DB, giới hạn quyền truy cập bảng `sessions`, giữ nguyên "không log session_id".

**[Medium] T10 — Denial of Service — Thiếu rate-limit cho Admin lock/unlock**
Một ADMIN bị compromise/độc hại có thể spam khóa hàng loạt tài khoản hợp lệ.
Likelihood: Thấp. Impact: Trung bình (khôi phục được, không mất dữ liệu).
Đề xuất: Liên kết với T9 (actor-tracking) để phát hiện bất thường; rate-limit nhẹ theo phiên Admin ở **Phase 3**.

**[Medium] T11 — Tampering — Race condition last-admin rule**
2 ADMIN cuối cùng đồng thời tự hạ cấp/khóa lẫn nhau — ĐÃ CÓ biện pháp (`SELECT...FOR UPDATE`).
Likelihood: Thấp (biện pháp chuẩn đã thiết kế đúng). Impact: Cao nếu xảy ra.
Đề xuất: Biện pháp hiện tại đủ cho Phase 2. Bổ sung DB trigger phòng hộ (tùy chọn) + test tích hợp bắt buộc cho kịch bản đồng thời ở **Phase 3**.

## Đánh giá trust boundary
- **TB1**: Có kiểm soát một phần (HttpOnly/Secure/SameSite=Lax) nhưng TLS/hạ tầng termination chưa xác định, và CSRF token chưa có — thiếu kiểm soát đầy đủ.
- **TB2**: Đã có kiểm soát rõ ràng qua `AuthGuard`.
- **TB3**: Có kiểm soát qua `RolesGuard` + `role_snapshot`, nhưng thiếu kiểm soát thu hồi quyền tức thời khi hạ cấp (T8) — điểm yếu nhất của ranh giới phân quyền.
- **TB4**: Kiểm soát logic (transaction, FOR UPDATE, hash token) đã có; kiểm soát hạ tầng (mã hoá at-rest, network ACL) chưa được đề cập — cần `iac-reviewer` khi có cấu hình hạ tầng thật.
- **TB5**: Thiếu kiểm soát rõ ràng — cơ chế bảo vệ secret SMTP chưa xác định (T13).

## Bất thường trong thiết kế
- **T8**: quyết định C-11 (role snapshot, áp dụng phiên tiếp theo) hợp lý cho thăng cấp nhưng tạo lỗ hổng nghiêm trọng cho hạ cấp ADMIN — chính kịch bản REQ-ADMIN-003 được sinh ra để xử lý.
- **Khoảng trống rate-limit giữa các phase**: nếu deploy tuần tự theo phase, tồn tại cửa sổ thời gian không được bảo vệ cho 4 endpoint public nhạy cảm.
- **Thiếu actor-tracking**: loại "audit log UI" khỏi phạm vi Giai đoạn 1 đã vô tình kéo theo mất khả năng forensic cơ bản cho hành động quyền lực cao nhất hệ thống — nên tách 2 quyết định (UI audit log vs lưu actor tối thiểu) khi stakeholder xác nhận lại.

## Ngoài phạm vi
- Hạ tầng TLS/deployment, bảo mật kết nối Backend↔PostgreSQL ở mức hạ tầng — thuộc `system-architect`/`iac-reviewer` khi có cấu hình hạ tầng thật.

## Tổng kết
Critical: 1 (T6) | High: 5 (T3, T4, T8, T9, T13) | Medium: 6 (T1, T2, T5, T7, T10, T11) | Low: 0

Bước tiếp theo: xác nhận với stakeholder các điểm T6/T8/T4/T9 trước khi Phase 2 LLD code `AdminModule`; khi có code, dùng `security-auditor` audit cụ thể implementation (constant-time check T5, rate-limiter T1/T6, CSRF middleware T4).
