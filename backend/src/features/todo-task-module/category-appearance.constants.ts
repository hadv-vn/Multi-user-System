// docs/Task_Category_ToDo.md mục 4.1 — bộ màu/icon cố định, tránh phải thêm color-picker/icon
// library mới. Icon lưu dạng chuỗi emoji trực tiếp trong DB (không cần bảng tra cứu riêng).
export const CATEGORY_COLOR_VALUES = [
  '#E53935',
  '#FB8C00',
  '#FDD835',
  '#43A047',
  '#1E88E5',
  '#5E35B1',
  '#8D6E63',
  '#757575',
] as const;
export const CATEGORY_DEFAULT_COLOR = '#1E88E5';

export const CATEGORY_ICON_VALUES = ['📁', '💼', '🏠', '🛒', '📚', '⭐', '❤️', '🎯'] as const;
export const CATEGORY_DEFAULT_ICON = '📁';
