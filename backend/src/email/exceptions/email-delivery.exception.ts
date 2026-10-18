/**
 * Lỗi hạ tầng gửi mail (SMTP tạm thời lỗi) — KHÔNG kế thừa HttpException vì
 * không map trực tiếp ra response của request đang xử lý (AuthService tự
 * bắt, log, không lan truyền — xem lld-phase1-auth-session.md).
 */
export class EmailDeliveryException extends Error {
  constructor(cause: unknown) {
    super('Không thể gửi email vào lúc này.');
    this.name = 'EmailDeliveryException';
    this.cause = cause;
  }
}
