'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { handleUnauthenticatedGlobally } from '@/features/session/hooks/handle-unauthenticated';
import { adminApi, type LockUnlockResult } from '@/lib/admin/admin-api';
import { useToast } from '@/components/ui/toast/use-toast';
import { displayMessageFor, hasCountdown } from '@/lib/auth/auth-error-display';
import { ApiError } from '@/lib/http/api-error';
import { useSession } from '@/lib/session/use-session';

export type LockUnlockAction = 'lock' | 'unlock';

export interface LockUnlockBannerError {
  message: string;
  countdownSeconds?: number;
}

export function useLockUnlockUser() {
  const router = useRouter();
  const { clearSession } = useSession();
  const { showSuccess } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bannerError, setBannerError] = useState<LockUnlockBannerError | null>(null);

  async function submit(
    userId: string,
    action: LockUnlockAction,
  ): Promise<LockUnlockResult | null> {
    setBannerError(null);
    setIsSubmitting(true);
    try {
      const result = action === 'lock' ? await adminApi.lockUser(userId) : await adminApi.unlockUser(userId);
      showSuccess(action === 'lock' ? 'Tài khoản đã bị khóa.' : 'Tài khoản đã được mở khóa.');
      return result;
    } catch (error) {
      if (handleUnauthenticatedGlobally(error, clearSession, router)) {
        return null;
      }
      if (error instanceof ApiError) {
        setBannerError({
          message: displayMessageFor(error),
          countdownSeconds: hasCountdown(error) ? error.retryAfterSeconds : undefined,
        });
      } else {
        setBannerError({ message: 'Đã có lỗi xảy ra, vui lòng thử lại sau.' });
      }
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetError(): void {
    setBannerError(null);
  }

  return { isSubmitting, bannerError, submit, resetError };
}
