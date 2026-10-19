'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { accountApi } from '@/lib/account/account-api';
import { handleUnauthenticatedGlobally } from '@/features/session/hooks/handle-unauthenticated';
import { ApiError } from '@/lib/http/api-error';
import { displayMessageFor, hasCountdown } from '@/lib/auth/auth-error-display';
import { useSession } from '@/lib/session/use-session';

export interface DeactivateBannerError {
  message: string;
  countdownSeconds?: number;
}

export function useDeactivateAccount() {
  const router = useRouter();
  const { clearSession } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bannerError, setBannerError] = useState<DeactivateBannerError | null>(null);

  async function submit(password: string): Promise<void> {
    setBannerError(null);
    setIsSubmitting(true);
    try {
      await accountApi.deactivateAccount({ password });
      clearSession();
      router.push('/login?reason=account_deactivated');
    } catch (error) {
      if (handleUnauthenticatedGlobally(error, clearSession, router)) {
        return;
      }
      if (error instanceof ApiError) {
        setBannerError({
          message: displayMessageFor(error),
          countdownSeconds: hasCountdown(error) ? error.retryAfterSeconds : undefined,
        });
      } else {
        setBannerError({ message: 'Đã có lỗi xảy ra, vui lòng thử lại sau.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return { isSubmitting, bannerError, submit };
}
