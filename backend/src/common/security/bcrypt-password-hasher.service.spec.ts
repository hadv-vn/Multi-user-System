import type { ConfigService } from '@nestjs/config';

import { BcryptPasswordHasher } from './bcrypt-password-hasher.service.js';

function createConfigServiceStub(saltRounds: number | undefined): ConfigService {
  return {
    get: vi.fn().mockReturnValue(saltRounds),
  } as unknown as ConfigService;
}

describe('BcryptPasswordHasher', () => {
  describe('hash/verify round-trip', () => {
    // Dùng saltRounds thấp (4) để test chạy nhanh — không ảnh hưởng hành vi
    // cần kiểm tra (round-trip hash/verify).
    const hasher = new BcryptPasswordHasher(createConfigServiceStub(4));

    it('verify trả true khi so khớp đúng mật khẩu đã hash', async () => {
      const hash = await hasher.hash('Str0ngPassw0rd');
      await expect(hasher.verify('Str0ngPassw0rd', hash)).resolves.toBe(true);
    });

    it('verify trả false khi mật khẩu sai, KHÔNG throw', async () => {
      const hash = await hasher.hash('Str0ngPassw0rd');
      await expect(hasher.verify('WrongPassword1', hash)).resolves.toBe(false);
    });

    it('hash() không trả về chính plaintext (không log/lưu dạng thô)', async () => {
      const plain = 'Str0ngPassw0rd';
      const hash = await hasher.hash(plain);
      expect(hash).not.toBe(plain);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('hash() của cùng 1 mật khẩu ở 2 lần gọi khác nhau cho ra 2 giá trị khác nhau (salt ngẫu nhiên)', async () => {
      const hash1 = await hasher.hash('Str0ngPassw0rd');
      const hash2 = await hasher.hash('Str0ngPassw0rd');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('saltRounds qua ConfigService', () => {
    it('dùng saltRounds đọc từ config (BCRYPT_SALT_ROUNDS), phản ánh qua cost factor trong hash', async () => {
      const hasher = new BcryptPasswordHasher(createConfigServiceStub(4));
      const hash = await hasher.hash('Str0ngPassw0rd');
      // Định dạng bcrypt: $<algo>$<cost>$<salt+hash> — cost=04 khi saltRounds=4.
      expect(hash).toMatch(/^\$2b\$04\$/);
    });

    it('dùng mặc định 12 khi config không trả giá trị (undefined)', async () => {
      const hasher = new BcryptPasswordHasher(createConfigServiceStub(undefined));
      const hash = await hasher.hash('Str0ngPassw0rd');
      expect(hash).toMatch(/^\$2b\$12\$/);
    });
  });
});
