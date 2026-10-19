import { PublicEnv } from '@/config/public-env';

import type { ApiErrorEnvelope, ApiSuccessEnvelope } from './api-envelope.types';
import { ApiError } from './api-error';
import type { HttpClient, HttpRequestOptions } from './http-client.interface';

const GENERIC_NETWORK_ERROR_MESSAGE =
  'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.';
const GENERIC_INVALID_RESPONSE_MESSAGE = 'Phản hồi từ máy chủ không hợp lệ. Vui lòng thử lại sau.';
const GENERIC_UNKNOWN_ERROR_MESSAGE = 'Đã có lỗi xảy ra. Vui lòng thử lại sau.';

export class FetchHttpClient implements HttpClient {
  constructor(private readonly baseUrl: string = PublicEnv.apiBaseUrl) {}

  async request<TData>(options: HttpRequestOptions): Promise<ApiSuccessEnvelope<TData>> {
    const response = await this.performFetch(options);
    const payload = await this.parseJsonBody(response);

    if (!response.ok) {
      throw this.toApiError(response.status, payload);
    }

    return (payload ?? {}) as ApiSuccessEnvelope<TData>;
  }

  private async performFetch(options: HttpRequestOptions): Promise<Response> {
    const headers: Record<string, string> = {
      ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    };
    try {
      return await fetch(this.buildUrl(options.path, options.query), {
        method: options.method,
        credentials: 'include',
        headers: Object.keys(headers).length > 0 ? headers : undefined,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      });
    } catch {
      throw new ApiError({ kind: 'NETWORK_ERROR', message: GENERIC_NETWORK_ERROR_MESSAGE });
    }
  }

  private async parseJsonBody(response: Response): Promise<unknown> {
    const rawText = await response.text();
    if (rawText.length === 0) {
      return undefined;
    }
    try {
      return JSON.parse(rawText);
    } catch {
      throw new ApiError({ kind: 'NETWORK_ERROR', message: GENERIC_INVALID_RESPONSE_MESSAGE });
    }
  }

  private toApiError(httpStatus: number, payload: unknown): ApiError {
    const errorBody = (payload as Partial<ApiErrorEnvelope> | undefined)?.error;
    return new ApiError({
      kind: 'HTTP_ERROR',
      httpStatus,
      code: errorBody?.code,
      message: errorBody?.message ?? GENERIC_UNKNOWN_ERROR_MESSAGE,
      details: errorBody?.details,
      retryAfterSeconds: errorBody?.retryAfterSeconds,
    });
  }

  private buildUrl(path: string, query?: Record<string, string | undefined>): string {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined) {
        url.searchParams.set(key, value);
      }
    }
    return url.toString();
  }
}
