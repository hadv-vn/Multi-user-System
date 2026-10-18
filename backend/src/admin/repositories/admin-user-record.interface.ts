export interface AdminUserListItemRecord {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: Date;
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
