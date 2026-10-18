export interface RegisteredUserResult {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: Date;
}

export type VerifyEmailStatus = 'VERIFIED' | 'ALREADY_VERIFIED';

export interface VerifyEmailResult {
  status: VerifyEmailStatus;
  email: string;
}

export interface LoginResult {
  user: { id: string; email: string; role: string };
  session: { id: string; expiresAt: Date };
}
