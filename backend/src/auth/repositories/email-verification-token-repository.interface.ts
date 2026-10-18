import { TokenRecord } from './token-record.interface.js';

export interface EmailVerificationTokenRepository {
  create(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  findByTokenHash(tokenHash: string): Promise<TokenRecord | null>;
  markUsed(tokenId: bigint): Promise<void>;
  invalidateActiveTokensForUser(userId: string): Promise<void>;
}

export const EMAIL_VERIFICATION_TOKEN_REPOSITORY = Symbol('EmailVerificationTokenRepository');
