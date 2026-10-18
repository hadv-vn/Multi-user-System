import type { ConfigService } from '@nestjs/config';

import { CsrfTokenService } from './csrf-token.service.js';

function createService(secret = 'fixed-csrf-secret-for-tests'): CsrfTokenService {
  const configService = {
    getOrThrow: vi.fn().mockReturnValue(secret),
  } as unknown as ConfigService;
  return new CsrfTokenService(configService);
}

describe('CsrfTokenService', () => {
  describe('deriveToken', () => {
    it('deterministic: cùng sessionId → cùng token qua 2 lần gọi liên tiếp', () => {
      const service = createService();

      const first = service.deriveToken('session-1');
      const second = service.deriveToken('session-1');

      expect(first).toBe(second);
      expect(first.length).toBeGreaterThan(0);
    });

    it('sessionId khác nhau → token khác nhau', () => {
      const service = createService();

      const tokenA = service.deriveToken('session-a');
      const tokenB = service.deriveToken('session-b');

      expect(tokenA).not.toBe(tokenB);
    });
  });

  describe('verify', () => {
    it('đúng token của đúng sessionId → true', () => {
      const service = createService();
      const token = service.deriveToken('session-1');

      expect(service.verify('session-1', token)).toBe(true);
    });

    it('token hợp lệ nhưng của session khác → false', () => {
      const service = createService();
      const tokenOfOtherSession = service.deriveToken('session-2');

      expect(service.verify('session-1', tokenOfOtherSession)).toBe(false);
    });

    it('token sai độ dài so với token thật → false, không throw', () => {
      const service = createService();

      expect(() => service.verify('session-1', 'too-short')).not.toThrow();
      expect(service.verify('session-1', 'too-short')).toBe(false);
    });

    it('token rỗng → false, không throw', () => {
      const service = createService();

      expect(service.verify('session-1', '')).toBe(false);
    });
  });
});
