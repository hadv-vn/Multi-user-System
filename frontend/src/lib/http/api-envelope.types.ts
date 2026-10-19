export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface ApiSuccessEnvelope<TData = undefined> {
  data?: TData;
  message?: string;
  meta?: PaginationMeta;
}

export interface ApiErrorDetailItem {
  field?: string;
  issue: string;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: ApiErrorDetailItem[];
  retryAfterSeconds?: number;
}

export interface ApiErrorEnvelope {
  error: ApiErrorBody;
}
