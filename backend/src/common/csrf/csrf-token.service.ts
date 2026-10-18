import { createHmac, timingSafeEqual } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Double-submit cookie dạng HMAC stateless (C-14) — không cần lưu token ở
 * DB/cache, token = HMAC-SHA256(secret, sessionId). Ràng buộc được CSRF
 * token với đúng session hiện tại (không chỉ so cookie==header thuần).
 */
@Injectable()
export class CsrfTokenService {
  private readonly secret: string;

  constructor(configService: ConfigService) {
    this.secret = configService.getOrThrow<string>('CSRF_SECRET');
  }

  deriveToken(sessionId: string): string {
    return createHmac('sha256', this.secret).update(sessionId).digest('base64url');
  }

  verify(sessionId: string, candidateToken: string): boolean {
    const expected = Buffer.from(this.deriveToken(sessionId));
    const candidate = Buffer.from(candidateToken);
    // Độ dài khác nhau là kết quả hợp lệ (không phải lỗi) — tránh timingSafeEqual
    // throw khi 2 buffer khác độ dài (nhất quán tinh thần chống timing attack T5).
    if (expected.length !== candidate.length) {
      return false;
    }
    return timingSafeEqual(expected, candidate);
  }
}
