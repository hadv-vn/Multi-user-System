/**
 * Gắn vào `request.authContext` bởi AuthGuard sau khi validate session
 * thành công (xem SessionService.getActiveSessionContext).
 */
export interface AuthenticatedUserContext {
  userId: string;
  /** Từ session.roleSnapshot — KHÔNG join real-time user_roles (C-11/C-12). */
  role: string;
  sessionId: string;
}
