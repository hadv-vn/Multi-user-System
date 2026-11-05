import { CsrfAwareHttpClient } from '../http/csrf-aware-http-client';
import type { HttpClient } from '../http/http-client.interface';
import type { PaginationMeta } from '../http/api-envelope.types';
import type { AccountStatus, UserRole } from '../session/authenticated-user.types';

export interface AdminUserListItem {
  id: string;
  email: string;
  role: UserRole;
  status: AccountStatus;
  createdAt: string;
}

/**
 * Chi tiết tài khoản cho màn hình quản trị — chỉ trường phục vụ quản trị
 * (SRS A-3). Mốc thời gian là chuỗi ISO 8601 hoặc null.
 */
export interface AdminUserDetail {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  status: AccountStatus;
  emailVerifiedAt: string | null;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  createdAt: string;
  updatedAt: string;
  activeSessionCount: number;
  lastLoginAt: string | null;
}

export interface ListUsersInput {
  page: number;
  limit: number;
  email?: string;
}

export interface ListUsersResult {
  items: AdminUserListItem[];
  meta: PaginationMeta;
}

export interface LockUnlockResult {
  id: string;
  status: AccountStatus;
}

export interface ChangeRoleResult {
  id: string;
  role: UserRole;
}

/**
 * Lớp DUY NHẤT trong FE biết path `/admin/*` — xem
 * docs/design/lld-frontend-phase2.md.
 */
export class AdminApi {
  constructor(private readonly httpClient: HttpClient = new CsrfAwareHttpClient()) {}

  async listUsers(input: ListUsersInput): Promise<ListUsersResult> {
    const { data, meta } = await this.httpClient.request<AdminUserListItem[]>({
      method: 'GET',
      path: '/admin/users',
      query: {
        page: String(input.page),
        limit: String(input.limit),
        email: input.email,
      },
    });
    if (!meta) {
      // Vi phạm bất biến hợp đồng (BE đổi contract) — không phải lỗi input.
      throw new Error('Invariant violation: GET /admin/users response thiếu `meta`.');
    }
    return { items: data ?? [], meta };
  }

  async getUser(id: string): Promise<AdminUserDetail> {
    const { data } = await this.httpClient.request<AdminUserDetail>({
      method: 'GET',
      path: `/admin/users/${encodeURIComponent(id)}`,
    });
    return data as AdminUserDetail;
  }

  async lockUser(id: string): Promise<LockUnlockResult> {
    const { data } = await this.httpClient.request<LockUnlockResult>({
      method: 'POST',
      path: `/admin/users/${id}/lock`,
    });
    return data as LockUnlockResult;
  }

  async unlockUser(id: string): Promise<LockUnlockResult> {
    const { data } = await this.httpClient.request<LockUnlockResult>({
      method: 'POST',
      path: `/admin/users/${id}/unlock`,
    });
    return data as LockUnlockResult;
  }

  async changeRole(id: string, role: UserRole): Promise<ChangeRoleResult> {
    const { data } = await this.httpClient.request<ChangeRoleResult>({
      method: 'PATCH',
      path: `/admin/users/${id}/role`,
      body: { role },
    });
    return data as ChangeRoleResult;
  }
}

export const adminApi = new AdminApi();
