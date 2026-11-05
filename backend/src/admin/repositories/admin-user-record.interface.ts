export interface AdminUserListItemRecord {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: Date;
}

/**
 * Chi tiết 1 user cho màn hình quản trị — CHỈ gồm trường phục vụ quản trị
 * tài khoản (SRS A-3, NFR-004). Tuyệt đối không thêm passwordHash, token,
 * hay dữ liệu nghiệp vụ của các feature module (vd nội dung task).
 */
export interface AdminUserDetailRecord {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  emailVerifiedAt: Date | null;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
  /** Số phiên chưa bị thu hồi và chưa hết hạn tại thời điểm truy vấn. */
  activeSessionCount: number;
  /** Thời điểm tạo phiên gần nhất (≈ lần đăng nhập gần nhất), null nếu chưa từng đăng nhập. */
  lastLoginAt: Date | null;
}

export interface AdminTargetUserRecord {
  id: string;
  status: string;
  roleName: string;
}

export interface ListUsersFilter {
  page: number;
  limit: number;
  email?: string;
}

export interface ListUsersResult {
  items: AdminUserListItemRecord[];
  totalItems: number;
}
