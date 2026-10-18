import { CreateUserData, FailedLoginAttemptResult, UserRecord } from './user-record.interface.js';

export interface UserRepository {
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(userId: string): Promise<UserRecord | null>;
  /** Tạo user + gán role mặc định USER trong cùng 1 transaction. */
  createWithDefaultRole(data: CreateUserData): Promise<UserRecord>;
  markEmailVerified(userId: string): Promise<void>;
  updatePasswordHash(userId: string, newPasswordHash: string): Promise<void>;
  /** Atomic increment ở tầng DB — tránh lost-update khi nhiều request đồng thời (C-5). */
  registerFailedLoginAttempt(userId: string): Promise<FailedLoginAttemptResult>;
  resetFailedLoginAttempts(userId: string): Promise<void>;
}

export const USER_REPOSITORY = Symbol('UserRepository');
