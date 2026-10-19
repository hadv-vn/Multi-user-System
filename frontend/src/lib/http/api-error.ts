import type { ApiErrorDetailItem } from './api-envelope.types';

export type ApiErrorKind = 'HTTP_ERROR' | 'NETWORK_ERROR';

export interface ApiErrorParams {
  kind: ApiErrorKind;
  message: string;
  httpStatus?: number;
  code?: string;
  details?: ApiErrorDetailItem[];
  retryAfterSeconds?: number;
}

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly httpStatus?: number;
  readonly code?: string;
  readonly details?: ApiErrorDetailItem[];
  readonly retryAfterSeconds?: number;

  constructor(params: ApiErrorParams) {
    super(params.message);
    this.name = 'ApiError';
    this.kind = params.kind;
    this.httpStatus = params.httpStatus;
    this.code = params.code;
    this.details = params.details;
    this.retryAfterSeconds = params.retryAfterSeconds;
  }
}
