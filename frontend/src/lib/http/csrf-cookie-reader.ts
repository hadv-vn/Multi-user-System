import { CSRF_COOKIE_NAME } from './csrf.constants';

/** Đọc cookie `csrfToken` (non-HttpOnly, theo C-14) từ `document.cookie`. */
export function readCsrfCookieValue(): string | undefined {
  const match = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${CSRF_COOKIE_NAME}=`));
  if (!match) {
    return undefined;
  }
  return decodeURIComponent(match.slice(CSRF_COOKIE_NAME.length + 1));
}
