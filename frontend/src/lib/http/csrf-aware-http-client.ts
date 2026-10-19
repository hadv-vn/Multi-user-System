import type { ApiSuccessEnvelope } from './api-envelope.types';
import { CSRF_HEADER_NAME } from './csrf.constants';
import { readCsrfCookieValue } from './csrf-cookie-reader';
import { FetchHttpClient } from './fetch-http-client';
import type { HttpClient, HttpRequestOptions } from './http-client.interface';

const SAFE_METHODS = new Set(['GET']);

/**
 * Decorator gắn header `X-CSRF-Token` cho request state-changing (C-14) —
 * KHÔNG sửa `FetchHttpClient`/`AuthApi` (Phase 1 không cần CSRF). Chỉ
 * `AccountApi`/`AdminApi` dùng client này.
 */
export class CsrfAwareHttpClient implements HttpClient {
  constructor(private readonly inner: HttpClient = new FetchHttpClient()) {}

  async request<TData>(options: HttpRequestOptions): Promise<ApiSuccessEnvelope<TData>> {
    if (SAFE_METHODS.has(options.method)) {
      return this.inner.request<TData>(options);
    }

    return this.inner.request<TData>({
      ...options,
      headers: { ...options.headers, [CSRF_HEADER_NAME]: readCsrfCookieValue() ?? '' },
    });
  }
}
