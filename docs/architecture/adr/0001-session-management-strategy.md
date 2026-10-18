# 0001. Session Management Strategy

## Status

Accepted (đã được stakeholder xác nhận ngày 2026-10-18).

## Context

Dự án Multi-User System, module nền tảng Auth/RBAC, đang trong giai đoạn thiết kế kiến trúc (system-architect), dựa trên SRS tại `docs/requirements/srs-multi-user-system.md`.

Đề xuất kỹ thuật ban đầu từ người dùng là JWT access token (ngắn hạn) + refresh token (dài hạn, lưu DB, có rotation/revocation) — mô hình phổ biến cho web app stateless.

SRS có 2 yêu cầu đã được stakeholder xác nhận chính thức mà quyết định quản lý phiên phải đáp ứng:

- **REQ-SESSION-001 AC3**: Given tài khoản bị khóa trong khi phiên đang hoạt động, When người dùng thực hiện hành động tiếp theo, Then phiên bị từ chối ngay tại hành động đó.
- **REQ-ADMIN-002 AC1**: Given ADMIN khóa một tài khoản, When thao tác hoàn tất, Then tài khoản chuyển trạng thái khóa và MỌI PHIÊN ĐĂNG NHẬP HIỆN TẠI của tài khoản đó bị kết thúc NGAY LẬP TỨC.

**Vấn đề kỹ thuật phát hiện được**: JWT access token là self-contained và stateless — một khi đã phát hành, token vẫn được xác thực hợp lệ (chữ ký đúng, chưa hết hạn) cho tới khi tự hết hạn (TTL), bất kể tài khoản có bị khóa ngay sau đó hay không, trừ khi có thêm một lớp kiểm tra trạng thái mỗi request (mà lớp đó lại triệt tiêu chính lợi ích "không cần tra cứu" của JWT). Vì vậy JWT thuần túy (Phương án B) không đáp ứng được 2 AC trên — đây là mâu thuẫn trực tiếp với yêu cầu nghiệp vụ đã chốt, không phải vấn đề thẩm mỹ hay sở thích công nghệ.

**Các phương án đã cân nhắc:**

- **Phương án A — Server-side session lưu PostgreSQL**: session_id đối chiếu DB mỗi request, cookie httpOnly. Đáp ứng trực tiếp 2 AC trên vì mỗi request đều tra trạng thái tài khoản hiện tại.
- **Phương án B — JWT access/refresh thuần túy** (đề xuất ban đầu): Không đáp ứng 2 AC trên — độ trễ revoke bằng với TTL của access token. Bị loại vì mâu thuẫn trực tiếp với yêu cầu đã chốt.
- **Phương án C — Hybrid JWT access + Redis revocation-list** kiểm tra mỗi request: Về lý thuyết đáp ứng được 2 AC, nhưng đánh mất chính lợi ích "stateless" của JWT trong khi vẫn cõng độ phức tạp của cả JWT (2 loại token, ký/verify, clock skew) lẫn cache (Redis, đồng bộ dữ liệu, rủi ro nếu cache lệch so với Postgres). Bị loại vì tốn chi phí hạ tầng/vận hành cao hơn Phương án A để đạt đúng cùng một kết quả.

Stakeholder đã xác nhận chọn Phương án A, chấp nhận đánh đổi so với đề xuất JWT ban đầu.

## Decision

Chọn **Phương án A**: quản lý phiên đăng nhập bằng server-side session lưu trong PostgreSQL.

- Khi đăng nhập thành công, backend tạo một bản ghi session (`user_id`, `session_id`, trạng thái, thời điểm hết hạn), trả `session_id` cho client qua cookie httpOnly + Secure.
- Mỗi request tới route yêu cầu đăng nhập, `AuthGuard`/middleware tra cứu session kèm trạng thái tài khoản hiện tại trong DB trước khi cho phép truy cập.
- Đăng xuất (REQ-SESSION-002) tương đương việc xóa/vô hiệu hóa bản ghi session đó.
- Khóa tài khoản (REQ-ADMIN-002) tương đương việc thu hồi toàn bộ session đang hoạt động của user đó ngay lập tức, trong cùng transaction với thao tác khóa.
- Thời hạn phiên mặc định: 7 ngày (theo ràng buộc C-7 trong SRS).
- Tầng truy cập session phải được thiết kế qua interface/abstraction (ví dụ `ISessionRepository`) theo nguyên tắc Dependency Inversion, cho phép thêm một lớp cache (ví dụ Redis) phía trước Postgres sau này nếu NFR hiệu năng đòi hỏi, mà không cần đổi lại kiến trúc domain/API — chỉ đổi implementation của interface.
- Không dùng JWT access/refresh cho phiên đăng nhập người dùng trong module này.

## Consequences

**Tích cực:**

- Đáp ứng chính xác, trực tiếp yêu cầu nghiệp vụ đã chốt (REQ-SESSION-001 AC3, REQ-ADMIN-002 AC1) mà không cần thêm hạ tầng (Redis) hay độ phức tạp đồng bộ 2 nguồn dữ liệu.
- Đơn giản hơn để reasoning/audit/test so với mô hình JWT + revocation list.
- Đăng xuất hoạt động tự nhiên đúng ngữ nghĩa (REQ-SESSION-002 AC2).
- Tận dụng transaction sẵn có của Postgres để đảm bảo tính nhất quán khi khóa tài khoản (thu hồi session và đổi trạng thái tài khoản trong cùng một transaction).

**Đánh đổi / rủi ro chấp nhận:**

- Mỗi request yêu cầu đăng nhập cần một lượt tra cứu DB (khác với JWT không cần tra cứu) — có thể ảnh hưởng hiệu năng ở quy mô lớn. NFR hiệu năng cụ thể (NFR-007) chưa được xác định trong SRS nên chưa có cơ sở coi đây là vấn đề thực tế ở giai đoạn 1.
- Nếu vấn đề hiệu năng phát sinh sau này, đã có đường nâng cấp rõ ràng (thêm cache layer phía sau `ISessionRepository`) mà không cần đổi lại quyết định này.
- Việc scale ngang nhiều instance backend không bị ảnh hưởng vì Postgres vốn đã là shared store (không gặp vấn đề session-affinity như một số session store in-memory).

**Ảnh hưởng tới các bước tiếp theo:**

- `data-modeler` cần thiết kế bảng `sessions` (không cần bảng `refresh_tokens` như mô hình JWT ban đầu).
- `api-designer` / `low-level-designer` cần thiết kế `AuthGuard` / `SessionService` dựa trên tra cứu session, không dựa trên verify JWT.
- `high-level-designer` cần phản ánh đúng mô hình này trong sơ đồ thành phần.
</content>
