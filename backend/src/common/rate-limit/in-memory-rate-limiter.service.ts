import { Injectable } from '@nestjs/common';

import { RateLimitConsumeResult, RateLimiter, RateLimitPolicy } from './rate-limiter.interface.js';

interface RateLimitBucket {
  count: number;
  windowResetAt: number;
}

/**
 * Fixed-window counter in-memory. Chỉ đúng hành vi khi backend chạy 1
 * instance duy nhất (giả định Giai đoạn 1 — xem HLD Deployment view).
 * Khi scale ngang nhiều instance, thay bằng implementation Redis-backed
 * cùng interface `RateLimiter`, không cần đổi call site.
 */
@Injectable()
export class InMemoryRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, RateLimitBucket>();

  consume(key: string, policy: RateLimitPolicy): Promise<RateLimitConsumeResult> {
    const now = Date.now();
    const windowMs = policy.windowSeconds * 1000;
    const existing = this.buckets.get(key);

    if (!existing || existing.windowResetAt <= now) {
      this.buckets.set(key, { count: 1, windowResetAt: now + windowMs });
      return Promise.resolve({
        allowed: true,
        remainingAttempts: policy.maxAttempts - 1,
        retryAfterSeconds: 0,
      });
    }

    if (existing.count >= policy.maxAttempts) {
      return Promise.resolve({
        allowed: false,
        remainingAttempts: 0,
        retryAfterSeconds: Math.ceil((existing.windowResetAt - now) / 1000),
      });
    }

    existing.count += 1;
    return Promise.resolve({
      allowed: true,
      remainingAttempts: policy.maxAttempts - existing.count,
      retryAfterSeconds: 0,
    });
  }
}
