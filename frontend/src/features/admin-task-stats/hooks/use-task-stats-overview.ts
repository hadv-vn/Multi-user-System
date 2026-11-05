'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { handleUnauthenticatedGlobally } from '@/features/session/hooks/handle-unauthenticated';
import {
  adminTaskStatsApi,
  type TaskStatsOverviewUser,
  type TaskStatusSummary,
} from '@/lib/admin-task-stats/admin-task-stats-api';
import { displayMessageFor } from '@/lib/auth/auth-error-display';
import { ApiError } from '@/lib/http/api-error';
import { useSession } from '@/lib/session/use-session';
import { useDebouncedValue } from '@/lib/utils/use-debounced-value';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 400;

export type TaskStatsOverviewViewState =
  | { kind: 'loading' }
  | { kind: 'success'; summary: TaskStatusSummary; items: TaskStatsOverviewUser[] }
  | { kind: 'empty'; summary: TaskStatusSummary }
  | { kind: 'error'; message: string }
  | { kind: 'forbidden' };

/** Cùng mô hình với use-admin-users-list: tìm kiếm debounce + phân trang + chống race bằng epoch. */
export function useTaskStatsOverview() {
  const router = useRouter();
  const { clearSession } = useSession();
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewState, setViewState] = useState<TaskStatsOverviewViewState>({ kind: 'loading' });
  const requestEpochRef = useRef(0);

  const [trackedSearch, setTrackedSearch] = useState(debouncedSearch);
  if (debouncedSearch !== trackedSearch) {
    setTrackedSearch(debouncedSearch);
    setPage(1);
  }

  useEffect(() => {
    void fetchPage(page, debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchPage đọc state qua closure có chủ đích (chống race bằng epoch, không cần liệt kê đủ deps).
  }, [page, debouncedSearch]);

  async function fetchPage(currentPage: number, email: string): Promise<void> {
    const myEpoch = ++requestEpochRef.current;
    setViewState({ kind: 'loading' });
    try {
      const result = await adminTaskStatsApi.getOverview({
        page: currentPage,
        limit: PAGE_SIZE,
        email: email || undefined,
      });
      if (myEpoch !== requestEpochRef.current) {
        return;
      }
      setTotalPages(result.meta.totalPages);
      setViewState(
        result.items.length === 0
          ? { kind: 'empty', summary: result.summary }
          : { kind: 'success', summary: result.summary, items: result.items },
      );
    } catch (error) {
      if (myEpoch !== requestEpochRef.current) {
        return;
      }
      if (handleUnauthenticatedGlobally(error, clearSession, router)) {
        return;
      }
      if (error instanceof ApiError && error.httpStatus === 403) {
        setViewState({ kind: 'forbidden' });
      } else {
        setViewState({
          kind: 'error',
          message: error instanceof ApiError ? displayMessageFor(error) : 'Không thể tải thống kê công việc.',
        });
      }
    }
  }

  return {
    viewState,
    searchInput,
    page,
    totalPages,
    updateSearchInput: setSearchInput,
    setPage,
    retry: () => void fetchPage(page, debouncedSearch),
  };
}
