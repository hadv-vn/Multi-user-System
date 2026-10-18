import { OpaqueTokenGenerator } from './opaque-token-generator.service.js';

describe('OpaqueTokenGenerator', () => {
  const generator = new OpaqueTokenGenerator();

  describe('generate()', () => {
    it('trả về plainToken dạng base64url không rỗng', () => {
      const { plainToken } = generator.generate();
      expect(plainToken.length).toBeGreaterThan(0);
      // base64url: chỉ gồm A-Z a-z 0-9 - _ , không có padding '='.
      expect(plainToken).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('sinh token khác nhau ở mỗi lần gọi (đủ entropy, không trùng lặp)', () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(generator.generate().plainToken);
      }
      expect(tokens.size).toBe(100);
    });
  });

  describe('hash()', () => {
    it('trả về chuỗi hex SHA-256 (64 ký tự hex)', () => {
      const hash = generator.hash('some-plain-token');
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('deterministic: cùng input luôn cho ra cùng hash', () => {
      const hash1 = generator.hash('same-input-token');
      const hash2 = generator.hash('same-input-token');
      expect(hash1).toBe(hash2);
    });

    it('input khác nhau cho ra hash khác nhau', () => {
      const hash1 = generator.hash('token-a');
      const hash2 = generator.hash('token-b');
      expect(hash1).not.toBe(hash2);
    });

    it('hash() không trả về chính plainToken (không lưu token thô)', () => {
      const { plainToken } = generator.generate();
      const hash = generator.hash(plainToken);
      expect(hash).not.toBe(plainToken);
    });
  });
});
