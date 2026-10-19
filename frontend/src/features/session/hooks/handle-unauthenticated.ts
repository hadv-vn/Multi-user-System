import { ApiError } from '@/lib/http/api-error';

export interface MinimalRouter {
  push: (href: string) => void;
}

/**
 * Dùng CHUNG ở mọi hook Account/Admin — nếu phiên bị revoke giữa lúc đang
 * dùng (401), logout cứng NGAY thay vì hiển thị banner lỗi vô nghĩa tại
 * chỗ. Trả `true` nếu đã xử lý (caller return ngay).
 */
export function handleUnauthenticatedGlobally(
  error: unknown,
  clearSession: () => void,
  router: MinimalRouter,
): boolean {
  if (error instanceof ApiError && error.httpStatus === 401) {
    clearSession();
    router.push('/login?reason=session_required');
    return true;
  }
  return false;
}
