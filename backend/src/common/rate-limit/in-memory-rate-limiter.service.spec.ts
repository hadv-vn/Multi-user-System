import { InMemoryRateLimiter } from './in-memory-rate-limiter.service.js';
import { RateLimitPolicy } from './rate-limiter.interface.js';

describe('InMemoryRateLimiter', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('consume() trong ngưỡng cho phép', () => {
    it('cho phép và giảm dần remainingAttempts đến khi còn 0', async () => {
      const limiter = new InMemoryRateLimiter();
      const policy: RateLimitPolicy = { maxAttempts: 3, windowSeconds: 60 };

      const r1 = await limiter.consume('key-a', policy);
      expect(r1).toEqual({ allowed: true, remainingAttempts: 2, retryAfterSeconds: 0 });

      const r2 = await limiter.consume('key-a', policy);
      expect(r2).toEqual({ allowed: true, remainingAttempts: 1, retryAfterSeconds: 0 });

      const r3 = await limiter.consume('key-a', policy);
      expect(r3).toEqual({ allowed: true, remainingAttempts: 0, retryAfterSeconds: 0 });
    });

    it('key khác nhau có bộ đếm độc lập, không ảnh hưởng lẫn nhau', async () => {
      const limiter = new InMemoryRateLimiter();
      const policy: RateLimitPolicy = { maxAttempts: 1, windowSeconds: 60 };

      const resultKeyA = await limiter.consume('key-a', policy);
      const resultKeyB = await limiter.consume('key-b', policy);

      expect(resultKeyA.allowed).toBe(true);
      expect(resultKeyB.allowed).toBe(true);
    });
  });

  describe('consume() vượt ngưỡng', () => {
    it('trả allowed=false và retryAfterSeconds > 0 khi vượt maxAttempts', async () => {
      const limiter = new InMemoryRateLimiter();
      const policy: RateLimitPolicy = { maxAttempts: 2, windowSeconds: 60 };

      await limiter.consume('key-a', policy);
      await limiter.consume('key-a', policy);
      const blocked = await limiter.consume('key-a', policy);

      expect(blocked.allowed).toBe(false);
      expect(blocked.remainingAttempts).toBe(0);
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
      expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(60);
    });

    it('vẫn tiếp tục trả allowed=false cho các lần gọi tiếp theo trong cùng cửa sổ', async () => {
      const limiter = new InMemoryRateLimiter();
      const policy: RateLimitPolicy = { maxAttempts: 1, windowSeconds: 60 };

      await limiter.consume('key-a', policy);
      const blocked1 = await limiter.consume('key-a', policy);
      const blocked2 = await limiter.consume('key-a', policy);

      expect(blocked1.allowed).toBe(false);
      expect(blocked2.allowed).toBe(false);
    });
  });

  describe('fixed-window reset', () => {
    it('reset bộ đếm và cho phép lại sau khi cửa sổ thời gian kết thúc', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

      const limiter = new InMemoryRateLimiter();
      const policy: RateLimitPolicy = { maxAttempts: 1, windowSeconds: 60 };

      await limiter.consume('key-a', policy);
      const blocked = await limiter.consume('key-a', policy);
      expect(blocked.allowed).toBe(false);

      // Vượt qua cửa sổ 60s.
      vi.setSystemTime(new Date('2026-01-01T00:01:01.000Z'));

      const allowedAgain = await limiter.consume('key-a', policy);
      expect(allowedAgain).toEqual({ allowed: true, remainingAttempts: 0, retryAfterSeconds: 0 });
    });
  });

  describe('race condition — nhiều consume() đồng thời sát ngưỡng', () => {
    it('tổng số lần "allowed=true" đúng bằng maxAttempts, không mất/không thừa lần đếm', async () => {
      const limiter = new InMemoryRateLimiter();
      const policy: RateLimitPolicy = { maxAttempts: 5, windowSeconds: 60 };
      const concurrentCalls = 20;

      const results = await Promise.all(
        Array.from({ length: concurrentCalls }, () => limiter.consume('key-concurrent', policy)),
      );

      const allowedCount = results.filter((result) => result.allowed).length;
      expect(allowedCount).toBe(policy.maxAttempts);
      expect(results.length - allowedCount).toBe(concurrentCalls - policy.maxAttempts);
    });
  });
});
