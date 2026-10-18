// Quy tắc độ mạnh mật khẩu (C-9): >= 8 ký tự, có ít nhất 1 chữ cái và 1 chữ số.
export const PASSWORD_STRENGTH_REGEX = /^(?=.*[A-Za-z])(?=.*\d).+$/;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const PASSWORD_WEAK_MESSAGE =
  'Mật khẩu phải có ít nhất 8 ký tự, gồm ít nhất 1 chữ cái và 1 chữ số.';
