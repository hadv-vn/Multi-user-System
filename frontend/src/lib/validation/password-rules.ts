// Đồng bộ tay với backend/src/auth/dto/password-rules.ts (C-9) — nếu rule
// đổi ở backend, phải sửa cả 2 nơi (xem docs/design/lld-frontend-phase0-1.md,
// mục "Giả định đã đưa ra").
export const PASSWORD_STRENGTH_REGEX = /^(?=.*[A-Za-z])(?=.*\d).+$/;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const PASSWORD_WEAK_MESSAGE =
  'Mật khẩu phải có ít nhất 8 ký tự, gồm ít nhất 1 chữ cái và 1 chữ số';
export const PASSWORD_RULE_HINT_TEXT =
  'Tối thiểu 8 ký tự, gồm ít nhất 1 chữ cái và 1 chữ số.';

export function isPasswordValid(password: string): boolean {
  return (
    password.length >= PASSWORD_MIN_LENGTH &&
    password.length <= PASSWORD_MAX_LENGTH &&
    PASSWORD_STRENGTH_REGEX.test(password)
  );
}
