# 0002. No CAPTCHA in Backend Phase 3 (Hardening)

## Status

Accepted (đã được xác nhận ngày 2026-10-19, dựa trên kết quả review lại của `threat-modeler` trong phiên làm việc Phase 3 Hardening).

## Context

HLD (`docs/design/hld-multi-user-system.md`, mục Phase breakdown — Phase 3) đặt điều kiện cho Phase 3: "nâng cao rate-limit (CAPTCHA nếu cần) nếu threat model Phase 3 review thấy mức hiện tại chưa đủ". Nghĩa là CAPTCHA không phải một hạng mục bắt buộc cố định của Phase 3, mà là một biện pháp có điều kiện — chỉ triển khai nếu threat model review cho thấy rate-limit hiện tại chưa đủ.

Threat model gốc (`docs/security/threat-model-multi-user-system.md`) đã xác định hai rủi ro liên quan:

- **T3** — spam resend/forgot/reset/verify-email.
- **T6** — brute-force login.

Threat model gốc đề xuất rate-limit cơ bản theo IP/IP+email ở Phase 1, và giữ CAPTCHA (nếu cần) làm biện pháp dự phòng cho Phase 3.

**Trạng thái hiện tại của backend** (đã implement, `backend/src/auth/rate-limit-policies.ts`):

- `REGISTER`: 10 lần / 3600s theo IP.
- `LOGIN`: 20 lần / 900s theo IP.
- `VERIFY_EMAIL`: 20 lần / 3600s theo IP.
- `RESEND_VERIFICATION`: 3 lần / 3600s theo IP+email.
- `FORGOT_PASSWORD`: 5 lần / 3600s theo IP.
- `RESET_PASSWORD`: 10 lần / 3600s theo IP.
- Ngoài ra có **account-lockout theo `userId`** (IP-agnostic), riêng cho login: 5 lần sai liên tiếp / 15 phút → khóa tài khoản 15 phút.

Trong phiên làm việc Phase 3 Hardening này, `threat-modeler` đã được chạy lại (phân tích STRIDE, tập trung vào DoS/brute-force/spam) để review cụ thể các ngưỡng trên theo đúng điều kiện mà HLD đặt ra. Nội dung Decision và Consequences dưới đây lấy nguyên văn kết luận của lượt review đó.

## Decision

**Không triển khai CAPTCHA ở Backend Phase 3 (Hardening).**

Lý do (theo kết luận của `threat-modeler`): rate-limit theo IP kết hợp account-lockout theo `userId` (IP-agnostic) hiện tại đã đóng đúng lỗ hổng brute-force/credential-stuffing nhằm vào một tài khoản — đây là rủi ro cao nhất trong T6 gốc. Các rủi ro còn lại (password spraying phân tán nhiều IP nhằm nhiều tài khoản; email-bombing phân tán IP qua forgot-password/resend-verification) có likelihood **thấp** ở giai đoạn hiện tại, vì:

- Hệ thống chưa có traffic thật.
- Chưa là target có giá trị công khai.
- Tấn công dạng này đòi hỏi attacker đầu tư hạ tầng proxy/botnet đáng kể.

Mức rủi ro còn lại này chưa đủ để đánh đổi với chi phí UX/triển khai của CAPTCHA (phụ thuộc bên thứ ba, tạo ma sát trải nghiệm đăng ký/đăng nhập).

## Consequences

**Tích cực:**

- Không phát sinh phụ thuộc vào dịch vụ CAPTCHA bên thứ ba (chi phí tích hợp, chi phí vận hành, điểm phụ thuộc bên ngoài thêm vào hệ thống).
- Trải nghiệm đăng ký/đăng nhập/quên mật khẩu/resend-verification không bị thêm ma sát.
- Các endpoint nhạy cảm vẫn được bảo vệ ở mức phù hợp với rủi ro hiện tại thông qua rate-limit theo IP + account-lockout theo `userId`.

**Đánh đổi / rủi ro chấp nhận:**

- Password spraying phân tán trên nhiều IP (mỗi IP thực hiện ít lần, trải trên nhiều tài khoản) không bị chặn hiệu quả bởi rate-limit theo IP hiện tại, và không bị account-lockout chặn nếu số lần sai trên mỗi tài khoản không vượt ngưỡng 5 lần/15 phút.
- Email-bombing phân tán qua nhiều IP (forgot-password/resend-verification nhằm vào một nạn nhân cụ thể) không bị chặn hiệu quả bởi rate-limit theo IP hiện tại.
- Hai rủi ro trên được chấp nhận ở mức hiện tại vì likelihood thấp (chưa có traffic thật, chưa là target giá trị công khai, đòi hỏi attacker đầu tư hạ tầng đáng kể), không phải vì đã được giảm thiểu bằng kiểm soát kỹ thuật.

**Điều kiện kích hoạt lại việc review CAPTCHA trong tương lai** (bất kỳ điều kiện nào xảy ra cần đưa quyết định này ra review lại, không tự động áp dụng CAPTCHA):

1. Traffic thật tăng và/hoặc hệ thống có user base công khai, đặc biệt nếu onboard khách hàng B2B hoặc tài khoản ADMIN có giá trị cao.
2. Log thực tế cho thấy dấu hiệu spraying (nhiều IP, mỗi IP ít lần, trải nhiều account) hoặc email-bomb phân tán nhằm một nạn nhân.
3. Thời điểm chuyển `InMemoryRateLimiterService` sang Redis-backed (multi-instance) — nên review CAPTCHA cùng lúc vì đang đầu tư lại hạ tầng rate-limit.
4. Nhận cảnh báo reputation/abuse từ nhà cung cấp SMTP.

**Lưu ý thêm:** khi hệ thống có WAF/CDN phía trước backend trong tương lai, nhiều tính năng bot-management ở lớp đó có thể giảm nhu cầu CAPTCHA ở application layer — nên cân nhắc cùng lúc với các điều kiện trên, không xét CAPTCHA độc lập.
