'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { handleUnauthenticatedGlobally } from '@/features/session/hooks/handle-unauthenticated';
import { adminApi, type AdminUserListItem } from '@/lib/admin/admin-api';
import { displayMessageFor } from '@/lib/auth/auth-error-display';
import { ApiError } from '@/lib/http/api-error';
import { useSession } from '@/lib/session/use-session';
import { useDebouncedValue } from '@/lib/utils/use-debounced-value';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 400;

export type AdminUsersViewState =
  | { kind: 'loading' }
  | { kind: 'success'; items: AdminUserListItem[] }
  | { kind: 'empty' }
  | { kind: 'error'; message: string }
  | { kind: 'forbidden' };

export function useAdminUsersList() {
  const router = useRouter();
  const { clearSession } = useSession();
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewState, setViewState] = useState<AdminUsersViewState>({ kind: 'loading' });
  const requestEpochRef = useRef(0);

  // Reset trang về 1 khi từ khóa (đã debounce) đổi — tính trong lúc render
  // (không dùng effect) theo đúng khuyến nghị React cho việc "điều chỉnh
  // state khi một giá trị khác đổi" (tránh 1 vòng render thừa).
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
      const result = await adminApi.listUsers({
        page: currentPage,
        limit: PAGE_SIZE,
        email: email || undefined,
      });
      if (myEpoch !== requestEpochRef.current) {
        return;
      }
      setTotalPages(result.meta.totalPages);
      setViewState(result.items.length === 0 ? { kind: 'empty' } : { kind: 'success', items: result.items });
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
          message: error instanceof ApiError ? displayMessageFor(error) : 'Không thể tải danh sách người dùng.',
        });
      }
    }
  }

  function updateItemInPlace(updated: Pick<AdminUserListItem, 'id'> & Partial<AdminUserListItem>): void {
    setViewState((current) => {
      if (current.kind !== 'success') {
        return current;
      }
      return {
        kind: 'success',
        items: current.items.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
      };
    });
  }

  return {
    viewState,
    searchInput,
    page,
    totalPages,
    updateSearchInput: setSearchInput,
    setPage,
    retry: () => void fetchPage(page, debouncedSearch),
    updateItemInPlace,
  };
}
