import { FetchHttpClient } from '../http/fetch-http-client';
import type { HttpClient } from '../http/http-client.interface';
import type { AuthenticatedUser, UserRole } from '../session/authenticated-user.types';

export interface RegisterInput {
  email: string;
  password: string;
}

export interface RegisteredUser {
  id: string;
  email: string;
  role: UserRole;
  status: string;
}

export type VerifyEmailStatus = 'VERIFIED' | 'ALREADY_VERIFIED';

export interface VerifyEmailOutcome {
  status: VerifyEmailStatus;
  email: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface ResetPasswordInput {
  token: string;
  newPassword: string;
}

/**
 * Lớp DUY NHẤT trong FE biết path `/auth/*` — xem
 * docs/design/lld-frontend-phase0-1.md.
 */
export class AuthApi {
  constructor(private readonly httpClient: HttpClient = new FetchHttpClient()) {}

  async register(input: RegisterInput): Promise<RegisteredUser> {
    const { data } = await this.httpClient.request<RegisteredUser>({
      method: 'POST',
      path: '/auth/register',
      body: input,
    });
    return data as RegisteredUser;
  }

  async verifyEmail(token: string): Promise<VerifyEmailOutcome> {
    const { data } = await this.httpClient.request<VerifyEmailOutcome>({
      method: 'GET',
      path: '/auth/verify-email',
      query: { token },
    });
    return data as VerifyEmailOutcome;
  }

  async resendVerification(email: string): Promise<void> {
    await this.httpClient.request({
      method: 'POST',
      path: '/auth/resend-verification',
      body: { email },
    });
  }

  async login(input: LoginInput): Promise<AuthenticatedUser> {
    const { data } = await this.httpClient.request<{ user: AuthenticatedUser }>({
      method: 'POST',
      path: '/auth/login',
      body: input,
    });
    return (data as { user: AuthenticatedUser }).user;
  }

  async forgotPassword(email: string): Promise<void> {
    await this.httpClient.request({
      method: 'POST',
      path: '/auth/forgot-password',
      body: { email },
    });
  }

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    await this.httpClient.request({
      method: 'POST',
      path: '/auth/reset-password',
      body: input,
    });
  }

  async logout(): Promise<void> {
    await this.httpClient.request({ method: 'POST', path: '/auth/logout' });
  }
}

export const authApi = new AuthApi();
