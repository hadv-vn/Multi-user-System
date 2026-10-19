import { CsrfAwareHttpClient } from '../http/csrf-aware-http-client';
import type { HttpClient } from '../http/http-client.interface';
import type { AccountStatus, UserRole } from '../session/authenticated-user.types';

export interface AccountProfile {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  status: AccountStatus;
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileInput {
  name: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface DeactivateAccountInput {
  password: string;
}

/**
 * Lớp DUY NHẤT trong FE biết path `/account/*` — xem
 * docs/design/lld-frontend-phase2.md.
 */
export class AccountApi {
  constructor(private readonly httpClient: HttpClient = new CsrfAwareHttpClient()) {}

  async getMyProfile(): Promise<AccountProfile> {
    const { data } = await this.httpClient.request<AccountProfile>({
      method: 'GET',
      path: '/account/me',
    });
    return data as AccountProfile;
  }

  async updateProfile(input: UpdateProfileInput): Promise<AccountProfile> {
    const { data } = await this.httpClient.request<AccountProfile>({
      method: 'PATCH',
      path: '/account/me',
      body: input,
    });
    return data as AccountProfile;
  }

  async changePassword(input: ChangePasswordInput): Promise<void> {
    await this.httpClient.request({
      method: 'POST',
      path: '/account/change-password',
      body: input,
    });
  }

  async deactivateAccount(input: DeactivateAccountInput): Promise<void> {
    await this.httpClient.request({
      method: 'POST',
      path: '/account/deactivate',
      body: input,
    });
  }
}

export const accountApi = new AccountApi();
