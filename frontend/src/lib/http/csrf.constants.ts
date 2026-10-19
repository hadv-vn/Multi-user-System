// Mirror thủ công với backend/src/common/csrf/csrf.constants.ts — không có
// cơ chế chia sẻ package chung giữa backend/ và frontend/ (xem
// docs/design/lld-frontend-phase2.md, mục "Giả định đã đưa ra").
export const CSRF_COOKIE_NAME = 'csrfToken';
export const CSRF_HEADER_NAME = 'x-csrf-token';
