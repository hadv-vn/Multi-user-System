export type UserRole = 'USER' | 'ADMIN';

export type AccountStatus = 'ACTIVE' | 'LOCKED' | 'PENDING_VERIFICATION' | 'DEACTIVATED';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  /** `undefined` nếu chưa rehydrate lần nào (xem docs/design/lld-frontend-phase2.md). */
  name?: string | null;
  status?: AccountStatus;
}
