// Khớp UpdateProfileDto thật (backend/src/account/dto/update-profile.dto.ts):
// @IsString() @Length(1,100) — bắt buộc, KHÔNG optional (khác thiết kế gốc
// của wireframe S7a, xem docs/design/lld-frontend-phase2.md mục "Rủi ro" #1).
export const NAME_MIN_LENGTH = 1;
export const NAME_MAX_LENGTH = 100;

export function isNameValid(name: string): boolean {
  return name.length >= NAME_MIN_LENGTH && name.length <= NAME_MAX_LENGTH;
}
