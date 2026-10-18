import { RateLimitPolicy } from '../common/rate-limit/rate-limiter.interface.js';

// Ngưỡng cụ thể là giá trị mặc định hợp lý (api-spec chỉ yêu cầu "rate-limit
// theo IP", không chỉ định con số) — cấu hình qua hằng số để dễ chỉnh sau.
export const REGISTER_RATE_LIMIT: RateLimitPolicy = { maxAttempts: 10, windowSeconds: 3600 };
export const LOGIN_RATE_LIMIT: RateLimitPolicy = { maxAttempts: 20, windowSeconds: 900 };
export const VERIFY_EMAIL_RATE_LIMIT: RateLimitPolicy = { maxAttempts: 20, windowSeconds: 3600 };
export const RESEND_VERIFICATION_RATE_LIMIT: RateLimitPolicy = {
  maxAttempts: 3,
  windowSeconds: 3600,
};
export const FORGOT_PASSWORD_RATE_LIMIT: RateLimitPolicy = {
  maxAttempts: 5,
  windowSeconds: 3600,
};
export const RESET_PASSWORD_RATE_LIMIT: RateLimitPolicy = {
  maxAttempts: 10,
  windowSeconds: 3600,
};
