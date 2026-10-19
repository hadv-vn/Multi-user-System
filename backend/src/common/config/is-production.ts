// Dùng để quyết định cookie `secure` (session `sid`, CSRF `csrfToken`) —
// qua HTTP thường ở local dev (không TLS), browser từ chối lưu cookie
// `secure: true`, khiến đăng nhập/CSRF không test được thật ở local.
export const IS_PRODUCTION = process.env.NODE_ENV === 'production';
