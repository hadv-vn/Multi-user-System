'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { handleUnauthenticatedGlobally } from '@/features/session/hooks/handle-unauthenticated';
import { adminTaskStatsApi, type UserTaskStats } from '@/lib/admin-task-stats/admin-task-stats-api';
import { displayMessageFor } from '@/lib/auth/auth-error-display';
import { ApiError } from '@/lib/http/api-error';
import { useSession } from '@/lib/session/use-session';

export type UserTaskStatsViewState =
  | { kind: 'loading' }
  | { kind: 'success'; stats: UserTaskStats }
  | { kind: 'error'; message: string };

export function useUserTaskStats(userId: string) {
  const router = useRouter();
  const { clearSession } = useSession();
  const [viewState, setViewState] = useState<UserTaskStatsViewState>({ kind: 'loading' });
  const requestEpochRef = useRef(0);

  const [trackedUserId, setTrackedUserId] = useState(userId);
  if (userId !== trackedUserId) {
    setTrackedUserId(userId);
    setViewState({ kind: 'loading' });
  }

  useEffect(() => {
    void fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchStats đọc state qua closure có chủ đích (chống race bằng epoch), giống use-admin-users-list.
  }, [userId]);

  async function fetchStats(): Promise<void> {
    const myEpoch = ++requestEpochRef.current;
    try {
      const stats = await adminTaskStatsApi.getUserTaskStats(userId);
      if (myEpoch === requestEpochRef.current) {
        setViewState({ kind: 'success', stats });
      }
    } catch (error) {
      if (myEpoch !== requestEpochRef.current) {
        return;
      }
      if (handleUnauthenticatedGlobally(error, clearSession, router)) {
        return;
      }
      setViewState({
        kind: 'error',
        message: error instanceof ApiError ? displayMessageFor(error) : 'Không thể tải thống kê công việc.',
      });
    }
  }

  function retry(): void {
    setViewState({ kind: 'loading' });
    void fetchStats();
  }

  return { viewState, retry };
}
