# Test Plan: Module nền tảng Auth + RBAC — Multi-User System (Giai đoạn 1)

| | |
|---|---|
| **Phiên bản** | 1.0 (draft) |
| **Ngày tạo** | 2026-10-18 |
| **Phạm vi** | Toàn bộ SRS v1.0 (Epic A–E), Phase 1 (Auth+Session, đã có LLD chi tiết) và Phase 2 (RBAC+Account+Admin, mức yêu cầu — LLD Phase 2 CHƯA tồn tại trong repo) |

## Nguồn yêu cầu đã dùng
- **SRS** `docs/requirements/srs-multi-user-system.md` (v1.0) — 5 Epic / 13 User Story, ràng buộc C-1..C-15 (đã xác nhận stakeholder), NFR-001..011 (NFR-007/008/009/010/011 chưa định lượng).
- **ADR-0001** `docs/architecture/adr/0001-session-management-strategy.md` (Accepted) — session server-side lưu PostgreSQL, cookie `sid` httpOnly+Secure, không JWT; revoke session tra cứu real-time mỗi request.
- **Data model** `docs/design/data-model-multi-user-system.md` — ERD 6 bảng; cơ chế last-admin rule qua `SELECT...FOR UPDATE`; `sessions.role_snapshot` theo C-11/C-12.
- **API spec** `docs/design/api-spec-multi-user-system.md` (draft) — 14 endpoint REST `/api/v1/*`, response envelope, mã lỗi, nguyên tắc chống lộ thông tin (mục 1.7/1.7.1), rate-limit (mục 1.8).
- **HLD** `docs/design/hld-multi-user-system.md` — Modular Monolith NestJS, phase breakdown (Phase 0/1/2/3), cập nhật threat model (C-12/C-13/C-14/C-15).
- **LLD Phase 1** `docs/design/lld-phase1-auth-session.md` — class/interface cấp code cho CommonModule/EmailModule/SessionModule/AuthModule; mục "Gợi ý điểm cần test" dùng trực tiếp cho ma trận Unit test Phase 1.
- **Threat model** `docs/security/threat-model-multi-user-system.md` — 12 threat (1 Critical: T6; 5 High: T3, T4, T8, T9, T13; 6 Medium: T1, T2, T5, T7, T10, T11).
- **UI wireframes** `docs/design/ui-wireframes-multi-user-system.md` — 9 màn hình (S1–S9), checklist thị giác futuristic/dark/glassmorphism (NFR-006).
- **LLD Phase 2** (RbacModule/AccountModule/AdminModule): **CHƯA tồn tại trong repo** tại thời điểm soạn Test Plan này — xem Entry criteria Phase 2.

## Phạm vi test

### Trong phạm vi
- Toàn bộ 13 User Story / 14 REQ ở SRS mục 3 (Epic A–E) và AC tương ứng.
- Ràng buộc C-1 đến C-15 (đặc biệt C-9 độ mạnh mật khẩu, C-11/C-12 role-snapshot & revoke khi hạ cấp, C-13 rate-limit IP, C-14 CSRF Phase 2, C-15 actor-tracking Phase 2).
- Mitigation ở mức code cho 12 threat trong threat-model, tập trung Critical/High: T6, T5, T3 (Phase 1), T8, T4, T9 (Phase 2), T13 (cấu hình secret). Threat Medium còn lại (T1, T2, T7, T10, T11) test ở mức phù hợp rủi ro (T11 bắt buộc có test race-condition dù mức Medium).
- 14 endpoint REST theo api-spec; 9 màn hình UI (S1–S9) ở mức luồng người dùng và tuân thủ checklist thị giác (NFR-006).

### Ngoài phạm vi
- OAuth, 2FA/MFA, multi-tenancy, i18n, vai trò Moderator, xem/thu hồi phiên đa thiết bị, hard-delete — theo SRS mục 5.2.
- Audit log UI đầy đủ — chỉ actor tối thiểu theo C-15 nằm trong phạm vi, không test UI xem log.
- Performance/Load/Stress test — NFR-007 chưa định lượng, quy mô Giai đoạn 1 là 1 instance. Cần `requirements-analyst` làm rõ NFR-007/008/009 trước khi lập kế hoạch performance test.
- Bootstrap ADMIN đầu tiên (REQ-RBAC-001 AC3) — vấn đề vận hành, chỉ cần smoke-check thủ công khi deploy môi trường mới.
- Hạ tầng TLS/mã hoá at-rest/network ACL — thuộc `system-architect`/`iac-reviewer`.
- Cơ chế hàng đợi/retry gửi email bền vững — Phase 1 dùng fire-and-forget + log lỗi.

## Cấp độ kiểm thử áp dụng

| Cấp độ | Áp dụng? | Ai thực hiện | Đối chiếu với | Ghi chú |
|---|---|---|---|---|
| Unit | Có | Developer / `test-writer` | LLD Phase 1 (mục "Gợi ý điểm cần test"); LLD Phase 2 khi có | Mock toàn bộ repository/`IEmailSender`/`IRateLimiter`/`IPasswordHasher`/`ICurrentRoleReader`. |
| Integration/SIT | Có | QA/Dev (`e2e-test-runner`/`test-writer`) | LLD, api-spec, data-model | API thật (NestJS) + PostgreSQL test instance thật; email qua fake `IEmailSender`. |
| System/E2E | Có | QA (`e2e-test-runner`) | SRS, HLD, ui-wireframes | Luồng người dùng đầy đủ qua UI thật + backend thật; SMTP sandbox cho verify-email/reset-password. |
| UAT | Không (giai đoạn này) | — | — | Module nền tảng kỹ thuật, stakeholder đã tham gia trực tiếp chốt SRS/ràng buộc. System test đóng vai trò gate nghiệp vụ cuối. Nếu có khách hàng cuối thực sự dùng trước go-live chính thức, cần bổ sung 1 vòng UAT nhẹ (giả định cần xác nhận lại). |

## Loại kiểm thử áp dụng

| Loại | Áp dụng? | Lý do |
|---|---|---|
| Functional | Có | Trọng tâm chính — toàn bộ AC của 14 REQ. |
| Regression | Có | Mỗi phase ảnh hưởng luồng đã test trước. Bắt buộc: bộ "chống lộ thông tin" (login sai mật khẩu/tài khoản không tồn tại → cùng response; forgot-password → cùng response) chạy lại ở mọi thay đổi `AuthService`. |
| Smoke | Có | Trước mỗi vòng Integration/E2E: backend khởi động, Postgres kết nối OK, migration+seed đã áp dụng — một phần Entry criteria. |
| Performance/Load/Stress | Không | NFR-007 chưa xác định, không có ngưỡng đo lường được. Cần `requirements-analyst` làm rõ trước. |
| Security | Có (bắt buộc) | 12 threat đã mô hình hóa, 1 Critical + 5 High — module xác thực/phân quyền là bề mặt tấn công giá trị cao nhất. |
| Usability | Có (hẹp) | Chỉ kiểm tra UI tuân thủ checklist futuristic/dark/glassmorphism bắt buộc theo NFR-006, không tổ chức usability testing với người dùng thật. |
| Compatibility | Có (hẹp) | Hành vi cookie httpOnly+SameSite=Lax nhất quán trên Chrome/Firefox/Edge mới nhất. |
| Data migration | Không | Migration khởi tạo đầu tiên, không có dữ liệu cũ cần migrate. |
| Recovery/Failover | Có (hẹp) | Không test full HA (1 instance). Chỉ test: SMTP lỗi tạm thời không làm fail request đăng ký chính. |

## Môi trường & dữ liệu test

- **Backend**: NestJS trên môi trường test riêng, PostgreSQL test instance riêng (không dùng chung dev/production). Migration + seed chạy lại trước mỗi vòng test suite.
- **SMTP**: Unit → mock hoàn toàn; Integration → fake `IEmailSender` capture nội dung, không gọi SMTP thật; E2E → `NodemailerSmtpSender` thật trỏ SMTP sandbox (MailHog/Ethereal), không gửi email thật ra ngoài trong CI.
- **Seed data tối thiểu**: 2 role (USER/ADMIN); ≥2 user ADMIN ACTIVE cho test thông thường; 1 dataset riêng chỉ có đúng 1 ADMIN ACTIVE cho nhóm test last-admin rule; user mẫu đủ status (ACTIVE, LOCKED, PENDING_VERIFICATION, DEACTIVATED, có `lockedUntil`); token mẫu còn hạn/hết hạn/đã dùng.
- **Mock vs thật theo cấp độ**:

| Dependency | Unit | Integration | E2E |
|---|---|---|---|
| Repository (User/Session/Token) | Mock | Thật (Prisma+Postgres test) | Thật |
| `IEmailSender` | Mock | Fake (capture) | Thật, SMTP sandbox |
| `IRateLimiter` (in-memory) | Mock | Thật | Thật |
| `IPasswordHasher` | Mock/thật tuỳ test (T5 cần thật) | Thật | Thật |
| `ICurrentRoleReader` | Mock | Thật | Thật |

## Tiêu chí vào (Entry criteria)

**Chung**: PostgreSQL test instance + migration + seed đã áp dụng; SMTP sandbox sẵn sàng; smoke test cơ bản pass.

**Phase 1**: LLD Phase 1 đã được xác nhận (không còn câu hỏi mở về thứ tự kiểm tra 1.7.1, rate-limit, dummy-hash T5); code Phase 1 build thành công, pass lint.

**Phase 2**: **LLD Phase 2 cho RbacModule/AccountModule/AdminModule phải tồn tại và được duyệt trước khi thực thi test Phase 2 — hiện CHƯA tồn tại trong repo**, đây là entry criterion chưa thỏa. Phase 1 đã đạt Exit criteria. Code Phase 2 build thành công.

## Tiêu chí ra (Exit criteria)

**Phase 1**: 100% test case cho REQ-AUTH-001..004, REQ-SESSION-001..002 đã thực thi và Pass; không còn defect Critical/High mở; 100% test case cho T6 (Critical)/T3 (High)/T5/T1 Pass; bộ regression chống lộ thông tin Pass 100%; test atomic `failedLoginAttempts` Pass.

**Phase 2**: 100% test case cho REQ-RBAC-001..002, REQ-ACCOUNT-001..003, REQ-ADMIN-001..003 Pass, bao gồm last-admin rule cho cả 3 kịch bản; không còn defect Critical/High mở; T8/T4/T9 Pass (T8 — revoke session khi hạ cấp ADMIN — là điều kiện bắt buộc không thương lượng); race-condition T11 Pass qua request đồng thời thật, chạy lặp lại nhiều lần; CSRF Pass cho toàn bộ route state-changing Admin/Account.

**Toàn module (trước Phase 3/go-live)**: toàn bộ Exit criteria Phase 1+2 đạt; T13 (secret SMTP qua env/secret manager, không hardcode) xác nhận; regression suite toàn bộ Phase 1+2 Pass 100%.

## Ma trận test case mức cao

> Mức cao — không phải test case chi tiết Given/When/Then hay test code. Dùng làm input cho `test-writer`/`e2e-test-runner`.

### Epic A — Đăng ký & Xác thực

| ID | Mô tả | Cấp độ | Loại | Ưu tiên |
|---|---|---|---|---|
| TC-AUTH001-01 | Đăng ký thành công → tạo user PENDING_VERIFICATION, role USER | Integration | Functional | Cao |
| TC-AUTH001-02 | Email đã tồn tại (kể cả hoa/thường) → 409, không tiết lộ status/role | Integration | Security/Regression (T2) | Cao |
| TC-AUTH001-03 | Mật khẩu không đạt chuẩn C-9 → từ chối | Unit | Functional | Trung bình |
| TC-AUTH001-04 | Email sai định dạng → từ chối | Unit | Functional | Thấp |
| TC-AUTH001-05 | Spam đăng ký từ cùng IP vượt ngưỡng → 429 (T1/C-6) | Integration | Security | Cao |
| TC-AUTH002-01 | Token verify-email hợp lệ, còn hạn → VERIFIED | Integration | Functional | Cao |
| TC-AUTH002-02 | Gọi lại token đã dùng → ALREADY_VERIFIED (idempotent) | Integration | Functional/Regression | Cao |
| TC-AUTH002-03 | Token hết hạn (>24h) → 410 | Integration | Functional | Trung bình |
| TC-AUTH002-04 | Rate-limit IP cho verify-email (T3) vượt ngưỡng → 429 | Integration | Security | Cao |
| TC-AUTH003-01 | Đăng nhập đúng, ACTIVE, đã verified → tạo session, set cookie sid | Integration | Functional | Cao |
| TC-AUTH003-02 | Sai mật khẩu VÀ tài khoản không tồn tại → cùng code/message 401 | Unit+Integration | Security/Regression (bắt buộc) | Cao |
| TC-AUTH003-03 | 5 lần sai → khóa tạm 15 phút; lần 6 dù đúng vẫn 429 | Integration | Security/Functional (C-5) | Cao |
| TC-AUTH003-04 | Tài khoản LOCKED → 403, không kiểm tra mật khẩu | Unit | Functional | Trung bình |
| TC-AUTH003-05 | Tài khoản PENDING_VERIFICATION → 403 | Unit | Functional | Trung bình |
| TC-AUTH003-06 | Rate-limit IP login (T6 Critical) — nhiều tài khoản cùng IP vượt ngưỡng → 429 | Integration | Security | **Cao nhất** |
| TC-AUTH003-07 | Timing-attack mitigation (T5) — verify() luôn gọi (dummy hash) kể cả email không tồn tại | Unit (spy) | Security | Trung bình |
| TC-AUTH003-08 | Đăng nhập thành công → failedLoginAttempts reset về 0 | Integration | Functional | Trung bình |
| TC-AUTH003-09 | 2 request sai mật khẩu đồng thời → đếm atomic, không mất update | Integration | Security/Regression | Trung bình |
| TC-AUTH004-01 | Email tồn tại → gửi link reset, response 200 chung | Integration | Functional | Cao |
| TC-AUTH004-02 | Email không tồn tại → response 200 giống hệt trên | Integration | Security/Regression | Cao |
| TC-AUTH004-03 | Token hợp lệ + mật khẩu mới hợp lệ → cập nhật, vô hiệu token, revoke toàn bộ session cũ | Integration | Functional/Security | Cao |
| TC-AUTH004-04 | Token hết hạn/đã dùng → từ chối đúng mã (410/409) | Integration | Functional | Trung bình |
| TC-AUTH004-05 | Mật khẩu mới trùng cũ → 422 | Unit | Functional | Thấp |
| TC-AUTH004-06 | Rate-limit IP cho forgot/reset-password (T3) | Integration | Security | Cao |

### Epic B — Quản lý phiên đăng nhập

| ID | Mô tả | Cấp độ | Loại | Ưu tiên |
|---|---|---|---|---|
| TC-SESSION001-01 | Phiên còn hạn → request tiếp tục chấp nhận | Integration | Functional | Trung bình |
| TC-SESSION001-02 | Phiên hết hạn (>7 ngày) → 401 | Integration | Functional | Trung bình |
| TC-SESSION001-03 | Tài khoản bị khóa giữa lúc phiên hoạt động → request tiếp theo bị từ chối ngay | Integration | Functional/Security | Cao |
| TC-SESSION001-04 | AuthGuard.canActivate — từng nhánh (không cookie, không tồn tại, revoked, hết hạn, user không ACTIVE, thành công) | Unit | Functional | Cao |
| TC-SESSION002-01 | Đăng xuất → session kết thúc, cookie xóa | Integration | Functional | Trung bình |
| TC-SESSION002-02 | Dùng lại session đã logout → 401 | Integration | Security/Regression | Cao |

### Epic C — Phân quyền RBAC (Phase 2, mức yêu cầu)

| ID | Mô tả | Cấp độ | Loại | Ưu tiên |
|---|---|---|---|---|
| TC-RBAC001-01 | Đăng ký công khai luôn nhận role USER | Integration | Functional | Cao |
| TC-RBAC001-02 | Gửi role=ADMIN trong body register → không có cách tự tạo ADMIN | Integration | Security | Cao |
| TC-RBAC002-01 | USER truy cập route ADMIN-only → 403 | Unit+Integration | Functional/Security | Cao |
| TC-RBAC002-02 | Chưa đăng nhập truy cập route cần login → 401 | Integration | Functional | Cao |
| TC-RBAC002-03 | ADMIN truy cập route USER → cho phép | Integration | Functional | Thấp |

### Epic D — Quản lý tài khoản cá nhân (Phase 2, mức yêu cầu)

| ID | Mô tả | Cấp độ | Loại | Ưu tiên |
|---|---|---|---|---|
| TC-ACC001-01 | User xem/sửa name của chính mình | Integration | Functional | Trung bình |
| TC-ACC001-02 | Không truyền được id người khác qua /account/* (chống IDOR) | Integration | Security | Trung bình |
| TC-ACC001-03 | Cố đổi email/role qua PATCH /account/me → từ chối | Integration | Functional/Security | Cao |
| TC-ACC002-01 | Đổi mật khẩu đúng currentPassword + newPassword hợp lệ → thành công | Integration | Functional | Trung bình |
| TC-ACC002-02 | currentPassword sai → từ chối | Integration | Functional | Trung bình |
| TC-ACC002-03 | newPassword yếu/trùng cũ → từ chối | Unit | Functional | Thấp |
| TC-ACC003-01 | Xác nhận đúng mật khẩu → DEACTIVATED (soft-delete), session kết thúc | Integration | Functional | Cao |
| TC-ACC003-02 | Tài khoản DEACTIVATED không đăng nhập lại được | Integration | Functional/Security | Cao |
| TC-ACC003-03 | ADMIN duy nhất tự vô hiệu hóa → bị chặn (C-3/C-10) | Integration | Security | Cao |

### Epic E — Quản trị người dùng — Admin (Phase 2, mức yêu cầu)

| ID | Mô tả | Cấp độ | Loại | Ưu tiên |
|---|---|---|---|---|
| TC-ADMIN001-01 | ADMIN xem danh sách, trả email/role/status | Integration | Functional | Trung bình |
| TC-ADMIN001-02 | Tìm kiếm theo email đúng kết quả | Integration | Functional | Trung bình |
| TC-ADMIN001-03 | USER cố truy cập /admin/users → 403 | Integration | Security | Cao |
| TC-ADMIN002-01 | Khóa tài khoản khác → LOCKED + mọi session bị thu hồi cùng transaction | Integration | Functional/Security | Cao |
| TC-ADMIN002-02 | Mở khóa → ACTIVE, đăng nhập lại được | Integration | Functional | Trung bình |
| TC-ADMIN002-03 | ADMIN duy nhất tự khóa chính mình → bị chặn | Integration | Security | Cao |
| TC-ADMIN002-04 | Actor-tracking: ghi đúng ADMIN nào khóa/mở khóa, lúc nào (T9, C-15) | Integration | Security | Cao |
| TC-ADMIN002-05 | Request lock/unlock thiếu CSRF token → bị từ chối (T4, C-14) | Integration/E2E | Security | Cao |
| TC-ADMIN003-01 | Thăng cấp USER→ADMIN → hiệu lực phiên tiếp theo, session hiện tại KHÔNG revoke (C-11) | Integration | Functional | Cao |
| TC-ADMIN003-02 | Hạ cấp ADMIN→USER → session hiện tại BỊ REVOKE NGAY (C-12, T8) | Integration | Security | **Cao nhất** |
| TC-ADMIN003-03 | ADMIN duy nhất tự hạ cấp chính mình → bị chặn | Integration | Security | Cao |
| TC-ADMIN003-04 | Hạ cấp ADMIN khác khi là ADMIN cuối cùng ACTIVE → bị chặn | Integration | Security | Cao |
| TC-ADMIN003-05 | Race-condition: 2 ADMIN cuối cùng đồng thời hạ cấp lẫn nhau → tối đa 1 thành công (T11) | Integration (đặc biệt) | Security | **Cao, bắt buộc** |
| TC-ADMIN003-06 | Actor-tracking cho đổi role (T9, C-15) | Integration | Security | Cao |

## Rủi ro kiểm thử & biện pháp

| Rủi ro | Biện pháp |
|---|---|
| Race-condition last-admin (T11) khó tái hiện ổn định — false-negative nếu chạy 1 lần | `Promise.all()` request đồng thời thật trên transaction thật (không mock); chạy lặp 20–50 lần trong CI. |
| `InMemoryRateLimiter` là state toàn cục theo process — test parallel có thể cross-contaminate | Mỗi test dùng IP/email giả lập riêng; nhóm test rate-limit/brute-force chạy serial, tách khỏi suite song song. |
| Timing-attack test (T5) khó đo chính xác trong CI (nhiễu runner/GC) | Không đo thời gian tuyệt đối — assert `IPasswordHasher.verify()` LUÔN được gọi (spy) kể cả nhánh email không tồn tại. |
| SMTP sandbox khác hành vi provider thật — bug chỉ lộ ở production | E2E tự động dùng sandbox là đủ; bổ sung smoke-test thủ công với provider thật ở staging trước go-live. |
| LLD Phase 2 chưa tồn tại — ma trận test case Phase 2 hiện ở mức khái niệm | Review lại Test Plan Phase 2 ngay sau khi LLD Phase 2 hoàn thành, trước khi viết test case/code thật. |
| Dataset last-admin (1 ADMIN ACTIVE) dễ nhiễu nếu chạy chung suite khác | Tách dataset riêng, rollback/reset fixture riêng cho nhóm test last-admin. |
| Session TTL 7 ngày/token TTL 24h quá dài để chờ thật | Set `expiresAt`/`createdAt` lùi về quá khứ trực tiếp qua DB trong integration test. |
| CSRF test khó mô phỏng đầy đủ hành vi cross-site bằng integration test gọi API trực tiếp | Tách 2 lớp: unit/integration cho logic middleware CSRF; 1 test E2E riêng mô phỏng 2 origin khác nhau. |
| Actor-tracking (T9) — rủi ro ghi thiếu actor nếu transaction fail giữa chừng | Test riêng kịch bản rollback (last-admin chặn) để xác nhận không có bản ghi actor "mồ côi". |

## Phân chia theo Phase

### Phase 1 — Auth + Session (ưu tiên cao nhất, đã có LLD)
- Unit: `BcryptPasswordHasher`, `InMemoryRateLimiter` (kèm race-condition), `SessionService.createSession` (role snapshot), `AuthGuard.canActivate` (đủ nhánh), `AuthService.login` (cùng exception cho 2 nhánh, LOCKED trả về trước khi check mật khẩu).
- Integration: register/verify/resend/login/forgot/reset/logout đầy đủ nhánh theo ma trận TC-AUTH*/TC-SESSION* ở trên.
- System/E2E: màn hình S1–S6 qua SMTP sandbox.
- Security trọng tâm: T6 (Critical), T3 (High), T5, T1 (Medium).

### Phase 2 — RBAC + Account + Admin (mức yêu cầu, cần LLD Phase 2 trước khi thực thi)
- Trọng tâm bắt buộc: C-12/T8 (revoke session khi hạ cấp ADMIN), C-14/T4 (CSRF), C-15/T9 (actor-tracking), T11 (race-condition last-admin, test bắt buộc dù rated Medium).
- Unit: `RolesGuard`, `LastAdminPolicyService` (3 kịch bản: tự vô hiệu hóa, khóa, hạ cấp).
- Integration: toàn bộ TC-RBAC*/TC-ACC*/TC-ADMIN* ở trên.
- System/E2E: màn hình S7–S9.
- **Điều kiện bắt buộc**: LLD Phase 2 phải tồn tại và được duyệt trước khi thực thi — ma trận có thể cần điều chỉnh tên class/method khi có LLD thật.

## Yêu cầu/NFR chưa đủ rõ để lập tiêu chí
NFR-007 (hiệu năng), NFR-008 (uptime/SLA), NFR-009 (scalability), NFR-010 (tuân thủ pháp lý), NFR-011 (audit log/observability tổng quát, khác C-15) đều "Chưa xác định" trong SRS — không thể lập test case có ngưỡng pass/fail. Cần `requirements-analyst` làm rõ nếu dự án cần mở rộng Test Plan sang các hướng này.

## Phát hiện cần xử lý trước khi viết test case chi tiết
**Mâu thuẫn API-spec vs UI-wireframe**: `api-spec-multi-user-system.md` mục 2.1 giả định `POST /auth/register` KHÔNG thu thập `name` (cập nhật sau qua `PATCH /account/me`), nhưng `ui-wireframes-multi-user-system.md` màn S1 thiết kế field "Họ tên" BẮT BUỘC ngay trên form đăng ký; LLD Phase 1 (`RegisterDto`) cũng chỉ có `email`/`password`, khớp với api-spec. Test Plan này tạm theo api-spec/LLD (2/3 tài liệu kỹ thuật đồng thuận) làm căn cứ cho test Integration/Unit. Cần xác nhận lại trước khi viết test case E2E cụ thể cho màn S1.

## Bước tiếp theo gợi ý
- Dùng `test-writer` để viết unit test Phase 1; dùng `e2e-test-runner` để viết/chạy integration/E2E test.
- Dùng `low-level-designer` để hoàn thành LLD Phase 2 trước khi thực thi test Phase 2.
- Giải quyết mâu thuẫn `name` ở luồng đăng ký trước khi viết test case chi tiết cho REQ-AUTH-001/S1.
