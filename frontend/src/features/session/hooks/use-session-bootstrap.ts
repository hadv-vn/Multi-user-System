'use client';

import { useCallback, useEffect, useState } from 'react';

import { accountApi } from '@/lib/account/account-api';
import { ApiError } from '@/lib/http/api-error';
import { useSession } from '@/lib/session/use-session';

const GENERIC_BOOTSTRAP_ERROR_MESSAGE = 'Không thể xác minh phiên đăng nhập. Vui lòng thử lại.';

export interface UseSessionBootstrapResult {
  isInitializing: boolean;
  bootstrapError: string | null;
  retry: () => void;
}

/**
 * Orchestration DUY NHẤT cho rehydrate phiên khi `AppShell` mount — gọi
 * `GET /account/me` một lần. Phân biệt rõ 401 (chưa đăng nhập) với lỗi hạ
 * tầng (network/5xx) để không đăng xuất nhầm người dùng hợp lệ.
 */
export function useSessionBootstrap(): UseSessionBootstrapResult {
  const { setSession, clearSession, completeInitializing } = useSession();
  const [isInitializing, setIsInitializing] = useState(true);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [bootstrapTrigger, setBootstrapTrigger] = useState(0);

  useEffect(() => {
    let isActive = true;

    async function run(): Promise<void> {
      try {
        const profile = await accountApi.getMyProfile();
        if (!isActive) return;
        setBootstrapError(null);
        setSession({
          id: profile.id,
          email: profile.email,
          role: profile.role,
          name: profile.name,
          status: profile.status,
        });
      } catch (error) {
        if (!isActive) return;
        if (error instanceof ApiError && error.httpStatus === 401) {
          clearSession();
        } else {
          setBootstrapError(
            error instanceof ApiError ? error.message : GENERIC_BOOTSTRAP_ERROR_MESSAGE,
          );
        }
      } finally {
        if (isActive) {
          setIsInitializing(false);
          completeInitializing();
        }
      }
    }

    void run();

    return () => {
      isActive = false;
    };
  }, [bootstrapTrigger, setSession, clearSession, completeInitializing]);

  const retry = useCallback(() => {
    setIsInitializing(true);
    setBootstrapTrigger((current) => current + 1);
  }, []);

  return { isInitializing, bootstrapError, retry };
}
