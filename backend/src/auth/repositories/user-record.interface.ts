export const USER_STATUS = {
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  ACTIVE: 'ACTIVE',
  LOCKED: 'LOCKED',
  DEACTIVATED: 'DEACTIVATED',
} as const;

export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  name: string | null;
  emailVerifiedAt: Date | null;
  status: string;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  disabledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  email: string;
  passwordHash: string;
}

export interface FailedLoginAttemptResult {
  attempts: number;
  lockedUntil: Date | null;
}
