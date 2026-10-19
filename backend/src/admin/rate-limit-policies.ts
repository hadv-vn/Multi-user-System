import { RateLimitPolicy } from '../common/rate-limit/rate-limiter.interface.js';

// Ngưỡng cụ thể là giá trị mặc định hợp lý (HLD/threat-model T10 chỉ yêu
// cầu "rate-limit nhẹ theo phiên Admin", không chỉ định con số) — cần
// stakeholder xác nhận, cấu hình qua hằng số để dễ chỉnh sau.
export const ADMIN_LOCK_UNLOCK_RATE_LIMIT: RateLimitPolicy = {
  maxAttempts: 30,
  windowSeconds: 600,
};
