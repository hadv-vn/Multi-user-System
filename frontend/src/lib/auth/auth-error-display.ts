import type { ApiError } from '../http/api-error';

export const GENERIC_ERROR_MESSAGE = 'Đã có lỗi xảy ra, vui lòng thử lại sau.';

/**
 * Mọi code rate-limit/khóa tạm (ACCOUNT_TEMPORARILY_LOCKED, *_RATE_LIMITED)
 * đều mang `retryAfterSeconds` — dùng chung 1 điều kiện để quyết định có
 * hiển thị đếm ngược hay không, thay vì so khớp từng chuỗi code.
 */
export function hasCountdown(error: ApiError): boolean {
  return typeof error.retryAfterSeconds === 'number' && error.retryAfterSeconds > 0;
}

export function displayMessageFor(error: ApiError): string {
  return error.code ? error.message : GENERIC_ERROR_MESSAGE;
}
