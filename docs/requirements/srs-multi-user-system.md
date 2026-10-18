# Software Requirements Specification (SRS)
## Multi-User System — Module nền tảng Authentication & RBAC (Giai đoạn 1)

| | |
|---|---|
| **Phiên bản** | 1.0 |
| **Ngày tạo** | 2026-10-18 |
| **Trạng thái** | Đã xác nhận với stakeholder (dựa trên output requirements-analyst) |
| **Phạm vi tài liệu** | Module auth + RBAC nền tảng, giai đoạn 1 |

---

## 1. Giới thiệu

### 1.1 Mục đích
Tài liệu này mô tả đầy đủ yêu cầu chức năng và phi chức năng của module nền tảng Authentication (đăng ký, xác thực, đăng nhập, quản lý phiên, quản lý tài khoản cá nhân) và phân quyền RBAC (USER/ADMIN) cho hệ thống Multi-User System, giai đoạn 1. Tài liệu dùng làm cơ sở để thiết kế kỹ thuật, phát triển, kiểm thử, và làm nguồn tham chiếu cho Requirements Traceability Matrix (RTM).

### 1.2 Phạm vi tài liệu
Tài liệu bao quát 5 Epic / 13 User Story đã được làm rõ và xác nhận với stakeholder: Đăng ký & Xác thực (Epic A), Quản lý phiên đăng nhập (Epic B), Phân quyền RBAC (Epic C), Quản lý tài khoản cá nhân (Epic D), Quản trị người dùng — Admin (Epic E). Repo dự án hiện hoàn toàn mới (chưa có code), đây là SRS đầu tiên của hệ thống.

### 1.3 Định nghĩa / Từ viết tắt
| Thuật ngữ | Giải thích |
|---|---|
| RBAC | Role-Based Access Control — kiểm soát truy cập dựa trên vai trò |
| USER | Vai trò mặc định, người dùng thông thường |
| ADMIN | Vai trò quản trị, có quyền quản lý người dùng khác |
| Soft-delete | Vô hiệu hóa logic (đổi trạng thái), không xóa dữ liệu vật lý |
| Last-admin rule | Quy tắc chặn mọi hành động khiến hệ thống không còn ADMIN nào |
| AC | Acceptance Criteria |
| FR / NFR | Functional Requirement / Non-Functional Requirement |

### 1.4 Tài liệu tham chiếu
- Output của `requirements-analyst` — bộ 5 Epic/13 User Story đã làm rõ và xác nhận với stakeholder (nội dung gốc dùng làm input cho tài liệu này).
- `CLAUDE.md` (gốc dự án) — quy định convention OOP/SOLID, naming, Conventional Commits, và đặc biệt là chuẩn UI futuristic/dark/glassmorphism được tham chiếu tại NFR-006.

---

## 2. Mô tả tổng quan

### 2.1 Bối cảnh nghiệp vụ
Hệ thống Multi-User System cần một module nền tảng để quản lý danh tính người dùng (đăng ký, xác thực, đăng nhập) và phân quyền truy cập (RBAC) làm cơ sở cho các module nghiệp vụ khác sẽ xây dựng sau này. Giai đoạn 1 tập trung vào luồng cơ bản nhất: email/mật khẩu, hai vai trò USER/ADMIN, không có các cơ chế nâng cao (OAuth, 2FA, đa phiên...).

### 2.2 Đối tượng sử dụng (Personas)
| Persona | Mô tả |
|---|---|
| **USER** | Người dùng đăng ký công khai, vai trò mặc định sau đăng ký. Chỉ truy cập/sửa được thông tin cá nhân của chính mình. |
| **ADMIN** | Người dùng có vai trò quản trị, được xem/tìm kiếm danh sách người dùng, khóa/mở khóa tài khoản, gán/thay đổi vai trò. Không có đường nào tự tạo ADMIN qua luồng đăng ký công khai; ADMIN đầu tiên được khởi tạo qua cơ chế bootstrap kỹ thuật/vận hành (ngoài phạm vi user story nghiệp vụ). |
| **Khách vãng lai (chưa đăng nhập)** | Có thể đăng ký, đăng nhập, yêu cầu đặt lại mật khẩu. Không truy cập được chức năng cần đăng nhập. |

### 2.3 Giả định (Assumptions)
*Các giả định dưới đây là đề xuất hợp lý từ requirements-analyst, CHƯA phải quyết định cuối cùng của stakeholder — cần xác nhận lại trước khi triển khai kỹ thuật.*

- **A-2**: Giai đoạn 1 chỉ có 2 vai trò USER/ADMIN, chưa cần vai trò trung gian (Moderator).
- **A-3**: ADMIN được xem thông tin cơ bản của USER (email, vai trò, trạng thái) trong danh sách quản trị, nhưng không có đặc quyền bỏ qua kiểm soát truy cập dữ liệu cá nhân khác ở các module nghiệp vụ tương lai.
- **A-4**: Không có yêu cầu tuân thủ pháp lý cụ thể (ví dụ GDPR) được nêu ở giai đoạn này; nếu phát sinh sau, cần rà soát lại chính sách xóa/giữ dữ liệu.
- **A-5**: Hệ thống vận hành theo mô hình single-tenant (không phải multi-tenant nhiều khách hàng độc lập).

### 2.4 Ràng buộc (Constraints) — Quyết định chính thức của stakeholder
*Các mục dưới đây đã được stakeholder xác nhận, là yêu cầu bắt buộc, KHÔNG phải giả định có thể thay đổi.*

- **C-1**: Xác thực email là **bắt buộc**. Tài khoản chưa xác thực email **không được phép đăng nhập**.
- **C-2**: Khi người dùng tự đóng tài khoản (D3), hệ thống chỉ thực hiện **vô hiệu hóa (soft-delete)**, **không xóa cứng dữ liệu**.
- **C-3**: Quy tắc "Admin cuối cùng" (last-admin rule): hệ thống **chặn mọi hành động** (tự vô hiệu hóa, tự khóa, bị hạ cấp) khiến hệ thống **không còn ADMIN nào**. Áp dụng cho D3, E2, E3.
- **C-4**: Giai đoạn 1 **không** cần OAuth/mạng xã hội, **không** cần xem/thu hồi phiên đăng nhập đa thiết bị. Mô hình phiên đăng nhập là đơn giản, không hiển thị/quản lý nhiều phiên cho người dùng.
- **C-5**: Ngưỡng chống brute-force (REQ-AUTH-003 AC4, NFR-002): **5 lần đăng nhập sai liên tiếp → khóa tạm 15 phút**.
- **C-6**: Cơ chế chống spam đăng ký hàng loạt (REQ-AUTH-001 AC5, NFR-003): **rate-limit theo địa chỉ IP nguồn**.
- **C-7**: Thời hạn phiên đăng nhập (REQ-SESSION-001): **7 ngày**. Thời hạn link xác thực email/đặt lại mật khẩu (REQ-AUTH-002, REQ-AUTH-004): **24 giờ**.
- **C-8**: Dịch vụ gửi email xác thực/reset mật khẩu: **dịch vụ transactional email bên thứ ba qua SMTP (ví dụ SendGrid/Amazon SES)**.
- **C-9**: Quy tắc độ mạnh mật khẩu tối thiểu: **≥ 8 ký tự, có ít nhất 1 chữ cái và 1 chữ số** (trước đây là Assumption A-1, nay đã được stakeholder xác nhận chính thức).
- **C-10**: Last-admin rule (mở rộng từ C-3): hệ thống **chặn MỌI hành động** — không chỉ tự-thực-hiện-với-chính-mình — khiến hệ thống không còn ADMIN nào. Áp dụng cho cả trường hợp một ADMIN khóa (E2) hoặc hạ cấp (E3) một ADMIN khác, nếu đó là ADMIN cuối cùng. Cập nhật AC: REQ-ADMIN-002 AC3 và REQ-ADMIN-003 AC2/AC3 áp dụng cho bất kỳ ai thực hiện hành động, không giới hạn ở việc tự thực hiện.
- **C-11**: Khi ADMIN đổi vai trò một người dùng (REQ-ADMIN-003 AC1), thay đổi có hiệu lực **ở phiên đăng nhập tiếp theo** của người dùng đó — session lưu snapshot vai trò tại thời điểm tạo, không cập nhật real-time cho phiên đang hoạt động. **Ngoại lệ (C-12)**: khi HẠ CẤP một ADMIN, áp dụng C-12 thay vì quy tắc này.
- **C-12** (bổ sung sau threat modeling, 2026-10-18): Khi ADMIN hạ cấp một ADMIN khác xuống USER, hệ thống **thu hồi ngay toàn bộ session đang hoạt động** của người bị hạ cấp (giống cơ chế khóa tài khoản ở REQ-ADMIN-002), KHÔNG áp dụng ở phiên tiếp theo như C-11. Lý do: tránh ADMIN vừa bị hạ cấp tiếp tục dùng quyền ADMIN cũ (kể cả tự gán lại ADMIN cho chính mình) trong thời gian session cũ còn hiệu lực — phát hiện qua threat model (T8), đi ngược mục đích bảo mật của REQ-ADMIN-003 (hạ cấp một ADMIN bị nghi ngờ/compromise). THĂNG cấp (USER → ADMIN) vẫn áp dụng C-11 (ở phiên tiếp theo) — không đổi.
- **C-13** (bổ sung sau threat modeling, 2026-10-18): Rate-limit theo IP cho `POST /auth/login` (chống credential stuffing, bổ sung cho cơ chế per-account C-5) và cho 4 endpoint public nhạy cảm `verify-email`/`resend-verification`/`forgot-password`/`reset-password` (chống spam/email-bombing) được triển khai **ngay từ Phase 1**, không để tới Phase 3 như kế hoạch HLD ban đầu.
- **C-14** (bổ sung sau threat modeling, 2026-10-18): CSRF protection (double-submit cookie hoặc header `X-CSRF-Token`) cho các endpoint state-changing dùng cookie session của AdminModule (lock/unlock/role) và AccountModule (change-password/deactivate) được triển khai **ở Phase 2** (cùng lúc các module đó được xây), không để tới Phase 3 như kế hoạch HLD ban đầu.
- **C-15** (bổ sung sau threat modeling, 2026-10-18): Mọi hành động quản trị nhạy cảm của AdminModule (khóa/mở khóa tài khoản, đổi vai trò) phải ghi nhận tối thiểu "ADMIN nào thực hiện, lúc nào" ngay từ Phase 2 (khi thiết kế dữ liệu/LLD của AdminModule) — không cần UI xem log đầy đủ ở giai đoạn này, nhưng dữ liệu actor phải được lưu ngay từ đầu vì không thể bổ sung hồi tố.

---

## 3. Yêu cầu chức năng (Functional Requirements)

> Mỗi yêu cầu được đánh mã `REQ-<EPIC>-<SỐ>` để truy xuất trong Requirements Traceability Matrix (RTM).

### 3.1 Epic A — Đăng ký & Xác thực

#### REQ-AUTH-001 — Đăng ký tài khoản bằng email/mật khẩu
**User Story**: Là khách vãng lai, tôi muốn đăng ký tài khoản bằng email/mật khẩu để sử dụng hệ thống.

**Acceptance Criteria**:
- AC1: Given email hợp lệ và chưa tồn tại trong hệ thống, và mật khẩu đạt độ mạnh tối thiểu, When người dùng đăng ký, Then hệ thống tạo tài khoản với vai trò USER, trạng thái "chưa xác thực email".
- AC2: Given email đã tồn tại trong hệ thống, When người dùng cố đăng ký bằng email đó, Then hệ thống từ chối, không tiết lộ chi tiết (không khẳng định email đã tồn tại theo cách lộ thông tin).
- AC3: Given mật khẩu không đạt độ mạnh tối thiểu, When người dùng đăng ký, Then hệ thống từ chối và nêu rõ quy tắc mật khẩu.
- AC4: Given email sai định dạng, When người dùng đăng ký, Then hệ thống từ chối.
- AC5: Given hệ thống phát hiện dấu hiệu spam/bot đăng ký hàng loạt từ cùng nguồn, When có yêu cầu đăng ký, Then hệ thống chặn/tạm khóa theo nguồn đó (xem thêm NFR-003).

#### REQ-AUTH-002 — Xác thực email sau đăng ký
**User Story**: Là người dùng mới đăng ký, tôi muốn xác thực email để kích hoạt tài khoản.

**Acceptance Criteria**:
- AC1: Given link xác thực hợp lệ còn hạn, When người dùng bấm vào link, Then tài khoản chuyển trạng thái "đã xác thực".
- AC2: Given link xác thực đã hết hạn, When người dùng bấm vào link, Then hệ thống báo hết hạn và cho phép gửi lại link mới.
- AC3: Given link xác thực đã được sử dụng trước đó, When người dùng bấm lại link, Then hệ thống báo "đã xác thực trước đó".

#### REQ-AUTH-003 — Đăng nhập bằng email/mật khẩu
**User Story**: Là người dùng đã đăng ký, tôi muốn đăng nhập bằng email/mật khẩu để sử dụng hệ thống.

**Acceptance Criteria**:
- AC1: Given email/mật khẩu đúng, tài khoản đã xác thực email, và không bị khóa, When người dùng đăng nhập, Then hệ thống tạo phiên đăng nhập.
- AC2: Given mật khẩu sai, When người dùng đăng nhập, Then hệ thống trả lỗi chung "email hoặc mật khẩu không đúng" (không tiết lộ email có tồn tại hay không).
- AC3: Given tài khoản không tồn tại, When người dùng đăng nhập, Then hệ thống trả lỗi chung giống hệt trường hợp sai mật khẩu (AC2).
- AC4: Given số lần đăng nhập sai liên tiếp vượt ngưỡng, When người dùng tiếp tục thử đăng nhập, Then hệ thống tạm khóa chống brute-force (xem NFR-002).
- AC5: Given tài khoản đang bị khóa, When người dùng đăng nhập, Then hệ thống từ chối kèm thông báo rõ ràng về việc tài khoản bị khóa.
- AC6 *(ràng buộc C-1, cập nhật theo quyết định stakeholder)*: Given tài khoản chưa xác thực email, When người dùng cố đăng nhập, Then hệ thống từ chối và yêu cầu xác thực email trước khi cho phép đăng nhập.

#### REQ-AUTH-004 — Quên/đặt lại mật khẩu
**User Story**: Là người dùng quên mật khẩu, tôi muốn đặt lại mật khẩu qua email để tiếp tục đăng nhập.

**Acceptance Criteria**:
- AC1: Given email tồn tại trong hệ thống, When người dùng yêu cầu đặt lại mật khẩu, Then hệ thống gửi link reset có thời hạn.
- AC2: Given email không tồn tại trong hệ thống, When người dùng yêu cầu đặt lại mật khẩu, Then hệ thống phản hồi thông điệp chung giống hệt trường hợp email tồn tại (không tiết lộ thông tin).
- AC3: Given link reset hợp lệ còn hạn và mật khẩu mới đạt chuẩn, When người dùng đặt mật khẩu mới, Then hệ thống cập nhật mật khẩu và vô hiệu hóa link reset.
- AC4: Given link reset đã hết hạn hoặc đã được sử dụng, When người dùng cố dùng lại, Then hệ thống từ chối.
- AC5: Given mật khẩu mới trùng mật khẩu cũ hoặc không đạt độ mạnh tối thiểu, When người dùng đặt mật khẩu mới, Then hệ thống từ chối.

### 3.2 Epic B — Quản lý phiên đăng nhập

#### REQ-SESSION-001 — Duy trì phiên đăng nhập
**User Story**: Là người dùng đã đăng nhập, tôi muốn phiên đăng nhập của tôi được duy trì trong một khoảng thời gian hợp lý.

**Acceptance Criteria**:
- AC1: Given phiên đăng nhập còn trong thời hạn, When người dùng thao tác trên hệ thống, Then hệ thống giữ trạng thái đăng nhập.
- AC2: Given phiên đăng nhập đã hết hạn, When người dùng thao tác tiếp, Then hệ thống yêu cầu đăng nhập lại.
- AC3: Given tài khoản bị khóa trong khi phiên đang hoạt động, When người dùng thực hiện hành động tiếp theo, Then phiên bị từ chối ngay tại hành động đó.

#### REQ-SESSION-002 — Đăng xuất
**User Story**: Là người dùng đã đăng nhập, tôi muốn đăng xuất để kết thúc phiên làm việc.

**Acceptance Criteria**:
- AC1: Given người dùng đang đăng nhập, When người dùng bấm đăng xuất, Then phiên đăng nhập kết thúc.
- AC2: Given phiên đã đăng xuất, When có yêu cầu dùng lại phiên (token/session) cũ đó, Then hệ thống từ chối.

### 3.3 Epic C — Phân quyền RBAC

#### REQ-RBAC-001 — Gán vai trò mặc định khi đăng ký
**User Story**: Là hệ thống, tôi cần đảm bảo mọi tài khoản đăng ký công khai đều nhận vai trò mặc định an toàn.

**Acceptance Criteria**:
- AC1: Given người dùng đăng ký qua luồng công khai, When tài khoản được tạo, Then vai trò luôn là USER.
- AC2: Không tồn tại đường nào trong luồng đăng ký công khai cho phép tự tạo tài khoản vai trò ADMIN.
- AC3: Tài khoản ADMIN đầu tiên của hệ thống được khởi tạo qua cơ chế bootstrap kỹ thuật/vận hành — đây là vấn đề triển khai, không phải user story nghiệp vụ, không cần AC nghiệp vụ bổ sung.

#### REQ-RBAC-002 — Chặn truy cập ngoài quyền hạn
**User Story**: Là hệ thống, tôi cần đảm bảo người dùng chỉ truy cập được các chức năng đúng với vai trò của họ.

**Acceptance Criteria**:
- AC1: Given người dùng có vai trò USER, When truy cập chức năng dành riêng cho ADMIN, Then hệ thống từ chối và thông báo rõ không đủ quyền.
- AC2: Given người dùng chưa đăng nhập, When truy cập chức năng yêu cầu đăng nhập, Then hệ thống yêu cầu đăng nhập.
- AC3: Given người dùng có vai trò ADMIN, When truy cập chức năng dành cho USER, Then hệ thống cho phép bình thường.

### 3.4 Epic D — Quản lý tài khoản cá nhân

#### REQ-ACCOUNT-001 — Xem/cập nhật thông tin cá nhân
**User Story**: Là người dùng đã đăng nhập, tôi muốn xem và cập nhật thông tin cá nhân của chính mình.

**Acceptance Criteria**:
- AC1: Người dùng chỉ xem/sửa được thông tin của chính mình, không truy cập được hồ sơ của người khác.
- AC2: Given tên hợp lệ, When người dùng cập nhật tên, Then hệ thống lưu thành công.
- AC3: Given người dùng cố đổi email hoặc vai trò qua form hồ sơ cá nhân, When gửi yêu cầu, Then hệ thống từ chối (đổi email/vai trò không thuộc luồng này).

#### REQ-ACCOUNT-002 — Đổi mật khẩu
**User Story**: Là người dùng đã đăng nhập, tôi muốn đổi mật khẩu của chính mình.

**Acceptance Criteria**:
- AC1: Given mật khẩu hiện tại đúng và mật khẩu mới đạt chuẩn, When người dùng đổi mật khẩu, Then hệ thống cập nhật thành công.
- AC2: Given mật khẩu hiện tại sai, When người dùng cố đổi mật khẩu, Then hệ thống từ chối.
- AC3: Given mật khẩu mới yếu hoặc trùng mật khẩu cũ, When người dùng cố đổi mật khẩu, Then hệ thống từ chối.

#### REQ-ACCOUNT-003 — Tự vô hiệu hóa tài khoản
**User Story**: Là người dùng đã đăng nhập, tôi muốn tự đóng tài khoản của mình khi không còn nhu cầu sử dụng.

**Acceptance Criteria**:
- AC1: Given người dùng xác nhận rõ ràng (ví dụ nhập lại mật khẩu), When người dùng yêu cầu vô hiệu hóa tài khoản, Then tài khoản chuyển trạng thái vô hiệu hóa (soft-delete theo ràng buộc C-2) và phiên hiện tại kết thúc.
- AC2: Given tài khoản đã vô hiệu hóa, When có yêu cầu đăng nhập lại bằng tài khoản đó, Then hệ thống từ chối.
- AC3 *(ràng buộc C-3 — last-admin rule)*: Given người dùng là ADMIN duy nhất còn lại trong hệ thống, When người dùng đó cố tự vô hiệu hóa tài khoản, Then hệ thống chặn hành động này.

### 3.5 Epic E — Quản trị người dùng (Admin)

#### REQ-ADMIN-001 — Xem/tìm kiếm danh sách người dùng
**User Story**: Là ADMIN, tôi muốn xem và tìm kiếm danh sách người dùng để quản lý hệ thống.

**Acceptance Criteria**:
- AC1: Danh sách hiển thị tối thiểu: email, vai trò, trạng thái của từng người dùng.
- AC2: Given ADMIN tìm kiếm theo email, When thực hiện tìm kiếm, Then kết quả lọc đúng theo email.
- AC3: Given người dùng có vai trò USER, When cố truy cập chức năng này, Then hệ thống từ chối.

#### REQ-ADMIN-002 — Khóa/mở khóa tài khoản
**User Story**: Là ADMIN, tôi muốn khóa hoặc mở khóa tài khoản người dùng khác để kiểm soát truy cập hệ thống.

**Acceptance Criteria**:
- AC1: Given ADMIN khóa một tài khoản, When thao tác hoàn tất, Then tài khoản chuyển trạng thái khóa và mọi phiên đăng nhập hiện tại của tài khoản đó bị kết thúc ngay lập tức.
- AC2: Given ADMIN mở khóa một tài khoản, When thao tác hoàn tất, Then tài khoản có thể đăng nhập lại bình thường.
- AC3 *(ràng buộc C-3 — last-admin rule)*: Given ADMIN đang là ADMIN duy nhất trong hệ thống, When ADMIN đó cố tự khóa chính mình, Then hệ thống chặn hành động này.

#### REQ-ADMIN-003 — Gán/thay đổi vai trò
**User Story**: Là ADMIN, tôi muốn gán hoặc thay đổi vai trò của người dùng khác.

**Acceptance Criteria**:
- AC1: Given ADMIN gán vai trò ADMIN cho một USER, When thao tác hoàn tất, Then thay đổi có hiệu lực (ở phiên đăng nhập tiếp theo của người dùng đó; chi tiết kỹ thuật về thời điểm áp dụng để lại cho thiết kế kỹ thuật).
- AC2 *(ràng buộc C-3 — last-admin rule)*: Given ADMIN đang là ADMIN duy nhất trong hệ thống, When ADMIN đó cố tự hạ cấp vai trò của chính mình, Then hệ thống chặn hành động này.
- AC3 *(ràng buộc C-3 — last-admin rule)*: Given một ADMIN khác đang được hạ cấp, When thao tác được thực hiện, Then hệ thống chỉ cho phép nếu sau khi hạ cấp, hệ thống vẫn còn ít nhất 1 ADMIN; ngược lại hệ thống chặn hành động.

---

## 4. Yêu cầu phi chức năng (Non-Functional Requirements)

| ID | Hạng mục | Nội dung |
|---|---|---|
| **NFR-001** | Bảo mật — lưu trữ mật khẩu | Mật khẩu không bao giờ được lưu trữ hoặc hiển thị dưới dạng plaintext ở bất kỳ đâu trong hệ thống. |
| **NFR-002** | Bảo mật — chống brute-force | 5 lần đăng nhập sai liên tiếp → khóa tạm 15 phút (ràng buộc C-5; liên quan REQ-AUTH-003 AC4). |
| **NFR-003** | Bảo mật — chống spam đăng ký | Rate-limit theo địa chỉ IP nguồn (ràng buộc C-6; liên quan REQ-AUTH-001 AC5). |
| **NFR-004** | Kiểm soát truy cập dữ liệu | Người dùng chỉ truy cập được dữ liệu cá nhân của chính mình, trừ khi là ADMIN được phân quyền rõ ràng cho đúng phạm vi quản trị (xem Assumption A-3 về giới hạn đặc quyền ADMIN). |
| **NFR-005** | Khả năng mở rộng mô hình RBAC | Mô hình RBAC phải có khả năng mở rộng thêm vai trò mới trong tương lai (ví dụ Moderator) mà không phải thiết kế lại kiến trúc phân quyền. |
| **NFR-006** | Chuẩn giao diện | Toàn bộ giao diện liên quan (đăng ký, đăng nhập, quên mật khẩu, hồ sơ cá nhân, trang quản trị người dùng) phải tuân theo chuẩn UI futuristic/dark theme/glassmorphism quy định trong `CLAUDE.md` của dự án (dark high-contrast theme, glassmorphism, geometric sans-serif typography, smooth transitions). |
| **NFR-007** | Hiệu năng (latency, throughput) | Chưa xác định — cần bổ sung. |
| **NFR-008** | Khả năng sẵn sàng (uptime/SLA) | Chưa xác định — cần bổ sung. |
| **NFR-009** | Khả năng mở rộng hạ tầng (scalability) | Chưa xác định — cần bổ sung. |
| **NFR-010** | Tuân thủ pháp lý/dữ liệu (ví dụ GDPR) | Chưa xác định — cần bổ sung (xem Assumption A-4: hiện không có yêu cầu tuân thủ pháp lý cụ thể được nêu). |
| **NFR-011** | Khả năng quan sát/audit log | Chưa xác định — cần bổ sung (audit log hành động Admin nằm trong danh sách Ngoài phạm vi, mục 6). |

---

## 5. Phạm vi (Scope)

### 5.1 Trong phạm vi (In Scope) — Giai đoạn 1
- Đăng ký tài khoản bằng email/mật khẩu (REQ-AUTH-001).
- Xác thực email bắt buộc sau đăng ký (REQ-AUTH-002, ràng buộc C-1).
- Đăng nhập bằng email/mật khẩu, bao gồm chống brute-force (REQ-AUTH-003).
- Quên/đặt lại mật khẩu qua email (REQ-AUTH-004).
- Quản lý phiên đăng nhập đơn giản: duy trì phiên, đăng xuất (REQ-SESSION-001, REQ-SESSION-002).
- Phân quyền RBAC hai vai trò: USER/ADMIN, gán mặc định và kiểm soát truy cập (REQ-RBAC-001, REQ-RBAC-002).
- Quản lý tài khoản cá nhân: xem/sửa thông tin, đổi mật khẩu, tự vô hiệu hóa tài khoản (soft-delete) (REQ-ACCOUNT-001 đến 003).
- Quản trị người dùng bởi ADMIN: xem/tìm kiếm, khóa/mở khóa, gán/thay đổi vai trò, kèm quy tắc last-admin (REQ-ADMIN-001 đến 003).

### 5.2 Ngoài phạm vi (Out of Scope) — Giai đoạn 1
- OAuth / đăng nhập mạng xã hội.
- 2FA / MFA (xác thực đa yếu tố).
- Multi-tenancy (nhiều khách hàng/tổ chức độc lập trên cùng hệ thống).
- Đa ngôn ngữ (i18n).
- Audit log hành động Admin.
- Vai trò trung gian Moderator.
- Xem/thu hồi phiên đăng nhập đa thiết bị.
- Xóa cứng (hard-delete) dữ liệu tài khoản.

---

## 6. Giao diện ngoài (External Interfaces)

Hệ thống tích hợp một dịch vụ transactional email bên thứ ba qua SMTP (ví dụ SendGrid/Amazon SES — ràng buộc C-8) để gửi email xác thực tài khoản (REQ-AUTH-002) và email đặt lại mật khẩu (REQ-AUTH-004). Không có OAuth provider hay tích hợp bên ngoài nào khác ở giai đoạn 1.

---

## 7. Phụ lục (Appendix)

### 7.1 Câu hỏi còn mở / cần xác nhận thêm
Đã được stakeholder chốt bổ sung (2026-10-18) — xem ràng buộc C-5 đến C-8 ở mục 2.4: ngưỡng brute-force, cơ chế chống spam, thời hạn phiên/link, dịch vụ gửi email. Không còn câu hỏi mở nào về định lượng trước khi thiết kế kỹ thuật.

### 7.2 Giả định cần xác nhận trước khi code
Xem mục 2.3 (Assumptions A-2 đến A-5) — A-1 đã được stakeholder xác nhận chính thức ngày 2026-10-18 và chuyển thành ràng buộc C-9.

### 7.3 Mâu thuẫn nội tại đã được giải quyết (ghi nhận lịch sử)
- Mô tả gốc ban đầu của Epic A (A2/A3) không bắt buộc xác thực email trước khi đăng nhập; stakeholder đã quyết định chính thức cập nhật thành bắt buộc (ràng buộc C-1). Tài liệu này đã áp dụng quyết định cập nhật (REQ-AUTH-003 AC6), không còn mâu thuẫn.
- Không phát hiện mâu thuẫn nội tại nào khác trong input nhận được.

### 7.4 Đối chiếu với hệ thống hiện có
Repo dự án hiện hoàn toàn trống (không có code, không có tài liệu yêu cầu nào trước đó) — không phát hiện mâu thuẫn với hành vi hệ thống hiện tại vì chưa có hệ thống nào tồn tại.
