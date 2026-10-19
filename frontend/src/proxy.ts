import { NextResponse, type NextRequest } from 'next/server';

import { PublicEnv } from './config/public-env';

/**
 * Chỉ là lớp tối ưu UX (tránh render nhầm trang bảo vệ rồi mới bật lại) —
 * KHÔNG phải lớp xác thực/phân quyền thật. Chỉ kiểm tra sự tồn tại của
 * cookie session, không decode/validate nội dung. Quyết định role/403 luôn
 * giao lại cho backend. Xem docs/design/lld-frontend-phase0-1.md.
 *
 * `matcher` khai báo sẵn path Phase 2 (`/profile`, `/admin`) — trong Phase 1
 * chưa có page thật dưới các path này nên middleware chưa có hiệu lực thực
 * tế, đây là scaffold chủ đích.
 */
export function proxy(request: NextRequest): NextResponse {
  const hasSessionCookie = request.cookies.has(PublicEnv.sessionCookieName);

  if (!hasSessionCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('reason', 'session_required');
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/profile/:path*', '/admin/:path*'],
};
