'use client';

import { useState } from 'react';

import { authApi } from '@/lib/auth/auth-api';
import { displayMessageFor, hasCountdown } from '@/lib/auth/auth-error-display';
import { useToast } from '@/components/ui/toast/use-toast';
import { ApiError } from '@/lib/http/api-error';
import { useCountdown } from '@/lib/utils/use-countdown';

const SUCCESS_COOLDOWN_SECONDS = 60;

export function useResendVerification(email: string) {
  const { showSuccess } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const countdown = useCountdown();

  async function resend(): Promise<void> {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await authApi.resendVerification(email);
      showSuccess('Đã gửi lại email xác thực.');
      countdown.start(SUCCESS_COOLDOWN_SECONDS);
    } catch (error) {
      if (error instanceof ApiError) {
        if (hasCountdown(error)) {
          countdown.start(error.retryAfterSeconds as number);
        }
        setErrorMessage(displayMessageFor(error));
      } else {
        setErrorMessage('Không thể gửi email lúc này, vui lòng thử lại sau.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    resend,
    isSubmitting,
    errorMessage,
    secondsRemaining: countdown.secondsRemaining,
    isCoolingDown: countdown.isRunning,
  };
}
