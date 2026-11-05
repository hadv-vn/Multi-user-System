'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { handleUnauthenticatedGlobally } from '@/features/session/hooks/handle-unauthenticated';
import { adminApi, type AdminUserDetail } from '@/lib/admin/admin-api';
import { displayMessageFor } from '@/lib/auth/auth-error-display';
import { ApiError } from '@/lib/http/api-error';
import { useSession } from '@/lib/session/use-session';

export type AdminUserDetailViewState =
  | { kind: 'loading' }
  | { kind: 'success'; user: AdminUserDetail }
  | { kind: 'not-found' }
  | { kind: 'forbidden' }
  | { kind: 'error'; message: string };

/** 400 (id không phải UUID) và 404 đều nghĩa là "không có user này" với người xem. */
const NOT_FOUND_HTTP_STATUSES = new Set([400, 404]);

export function useAdminUserDetail(userId: string) {
  const router = useRouter();
  const { clearSession } = useSession();
  const [viewState, setViewState] = useState<AdminUserDetailViewState>({ kind: 'loading' });
  const requestEpochRef = useRef(0);

  // Đổi sang user khác (cùng instance component) → về trạng thái loading,
  // tính trong lúc render thay vì trong effect (giống use-admin-users-list).
  const [trackedUserId, setTrackedUserId] = useState(userId);
  if (userId !== trackedUserId) {
    setTrackedUserId(userId);
    setViewState({ kind: 'loading' });
  }

  useEffect(() => {
    void fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchUser đọc state qua closure có chủ đích (chống race bằng epoch), giống use-admin-users-list.
  }, [userId]);

  /** Chỉ cập nhật state SAU khi request kết thúc — an toàn để gọi từ effect. */
  async function fetchUser(): Promise<void> {
    const myEpoch = ++requestEpochRef.current;
    try {
      const user = await adminApi.getUser(userId);
      if (myEpoch === requestEpochRef.current) {
        setViewState({ kind: 'success', user });
      }
    } catch (error) {
      if (myEpoch !== requestEpochRef.current) {
        return;
      }
      if (handleUnauthenticatedGlobally(error, clearSession, router)) {
        return;
      }
      setViewState(toFailureViewState(error));
    }
  }

  function retry(): void {
    setViewState({ kind: 'loading' });
    void fetchUser();
  }

  /** Tải lại sau một hành động (khóa/đổi vai trò): giữ nội dung đang hiện, không nháy spinner. */
  function refresh(): void {
    void fetchUser();
  }

  return {
    viewState,
    retry,
    refresh,
  };
}

function toFailureViewState(error: unknown): AdminUserDetailViewState {
  if (error instanceof ApiError && error.httpStatus === 403) {
    return { kind: 'forbidden' };
  }
  if (error instanceof ApiError && error.httpStatus !== undefined && NOT_FOUND_HTTP_STATUSES.has(error.httpStatus)) {
    return { kind: 'not-found' };
  }
  return {
    kind: 'error',
    message: error instanceof ApiError ? displayMessageFor(error) : 'Không thể tải thông tin người dùng.',
  };
}
