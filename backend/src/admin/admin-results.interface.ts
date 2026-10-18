import { AdminUserListItemRecord } from './repositories/admin-user-record.interface.js';

export interface PaginatedAdminUserList {
  items: AdminUserListItemRecord[];
  meta: { page: number; limit: number; totalItems: number; totalPages: number };
}

export interface AdminUserStatusResult {
  id: string;
  status: string;
}

export interface AdminRoleChangeResult {
  id: string;
  role: string;
}
