import { randomBytes, createHash } from 'node:crypto';

import { Injectable } from '@nestjs/common';

export interface GeneratedToken {
  plainToken: string;
}

const TOKEN_BYTE_LENGTH = 32;

/**
 * Sinh và hash token một lần dùng (email-verification, password-reset).
 * Chỉ có 1 implementation — không cần interface (tránh premature abstraction).
 */
@Injectable()
export class OpaqueTokenGenerator {
  generate(): GeneratedToken {
    return { plainToken: randomBytes(TOKEN_BYTE_LENGTH).toString('base64url') };
  }

  hash(plainToken: string): string {
    return createHash('sha256').update(plainToken).digest('hex');
  }
}
