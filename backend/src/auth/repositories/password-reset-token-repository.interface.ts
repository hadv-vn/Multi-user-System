import { TokenRecord } from './token-record.interface.js';

export interface PasswordResetTokenRepository {
  create(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  findByTokenHash(tokenHash: string): Promise<TokenRecord | null>;
  markUsed(tokenId: bigint): Promise<void>;
  invalidateActiveTokensForUser(userId: string): Promise<void>;
}

export const PASSWORD_RESET_TOKEN_REPOSITORY = Symbol('PasswordResetTokenRepository');
