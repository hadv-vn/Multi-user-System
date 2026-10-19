import type { ApiSuccessEnvelope } from './api-envelope.types';

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export interface HttpRequestOptions {
  method: HttpMethod;
  path: string;
  body?: unknown;
  query?: Record<string, string | undefined>;
  headers?: Record<string, string>;
}

/**
 * Trừu tượng hóa cơ chế gọi HTTP (Dependency Inversion) để các lớp *Api
 * (AuthApi, và AccountApi/AdminApi ở Phase 2) không phụ thuộc trực tiếp
 * `fetch` — xem docs/design/lld-frontend-phase0-1.md.
 */
export interface HttpClient {
  request<TData>(options: HttpRequestOptions): Promise<ApiSuccessEnvelope<TData>>;
}
