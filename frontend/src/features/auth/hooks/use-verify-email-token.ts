'use client';

import { useEffect, useState } from 'react';

import { authApi } from '@/lib/auth/auth-api';
import { ApiError } from '@/lib/http/api-error';

export type VerifyEmailViewState =
  | { kind: 'loading' }
  | { kind: 'verified' }
  | { kind: 'alreadyVerified' }
  | { kind: 'expired' }
  | { kind: 'invalid' };

export function useVerifyEmailToken(token: string | null): VerifyEmailViewState {
  const [state, setState] = useState<VerifyEmailViewState>(
    token ? { kind: 'loading' } : { kind: 'invalid' },
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    let isActive = true;

    async function run(): Promise<void> {
      try {
        const outcome = await authApi.verifyEmail(token as string);
        if (!isActive) return;
        setState(outcome.status === 'VERIFIED' ? { kind: 'verified' } : { kind: 'alreadyVerified' });
      } catch (error) {
        if (!isActive) return;
        if (error instanceof ApiError && error.code === 'TOKEN_EXPIRED') {
          setState({ kind: 'expired' });
        } else {
          // Bao gồm TOKEN_INVALID, TOKEN_VERIFY_RATE_LIMITED, lỗi mạng/hệ
          // thống — fallback an toàn để luôn có CTA, không để màn hình treo.
          setState({ kind: 'invalid' });
        }
      }
    }

    void run();

    return () => {
      isActive = false;
    };
  }, [token]);

  return state;
}
