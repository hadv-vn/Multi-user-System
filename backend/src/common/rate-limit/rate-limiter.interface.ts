export interface RateLimitPolicy {
  maxAttempts: number;
  windowSeconds: number;
}

export interface RateLimitConsumeResult {
  allowed: boolean;
  remainingAttempts: number;
  retryAfterSeconds: number;
}

export interface RateLimiter {
  consume(key: string, policy: RateLimitPolicy): Promise<RateLimitConsumeResult>;
}

export const RATE_LIMITER = Symbol('RateLimiter');
