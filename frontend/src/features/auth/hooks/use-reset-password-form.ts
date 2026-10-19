'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { authApi } from '@/lib/auth/auth-api';
import { displayMessageFor, hasCountdown } from '@/lib/auth/auth-error-display';
import { ApiError } from '@/lib/http/api-error';
import { isPasswordValid, PASSWORD_WEAK_MESSAGE } from '@/lib/validation/password-rules';

export interface ResetPasswordFormValues {
  newPassword: string;
  confirmPassword: string;
}

export interface ResetPasswordFormErrors {
  newPassword?: string;
  confirmPassword?: string;
}

export interface ResetPasswordBannerError {
  message: string;
  countdownSeconds?: number;
}

export type ResetPasswordViewState = 'form' | 'success' | 'linkInvalid';

const INITIAL_VALUES: ResetPasswordFormValues = { newPassword: '', confirmPassword: '' };
const SUCCESS_REDIRECT_DELAY_MS = 3000;
const LINK_INVALID_CODES = new Set(['TOKEN_INVALID', 'TOKEN_EXPIRED', 'TOKEN_ALREADY_USED']);

function validateResetPasswordForm(values: ResetPasswordFormValues): ResetPasswordFormErrors {
  const errors: ResetPasswordFormErrors = {};

  if (!values.newPassword) {
    errors.newPassword = 'Vui lòng nhập mật khẩu mới';
  } else if (!isPasswordValid(values.newPassword)) {
    errors.newPassword = PASSWORD_WEAK_MESSAGE;
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = 'Vui lòng nhập lại mật khẩu mới';
  } else if (values.confirmPassword !== values.newPassword) {
    errors.confirmPassword = 'Mật khẩu xác nhận không khớp';
  }

  return errors;
}

export function useResetPasswordForm(token: string | null) {
  const router = useRouter();
  const [values, setValues] = useState<ResetPasswordFormValues>(INITIAL_VALUES);
  const [fieldErrors, setFieldErrors] = useState<ResetPasswordFormErrors>({});
  const [bannerError, setBannerError] = useState<ResetPasswordBannerError | null>(null);
  const [view, setView] = useState<ResetPasswordViewState>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(field: keyof ResetPasswordFormValues, value: string): void {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function submit(): Promise<void> {
    if (!token) {
      setView('linkInvalid');
      return;
    }

    const errors = validateResetPasswordForm(values);
    setFieldErrors(errors);
    setBannerError(null);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.resetPassword({ token, newPassword: values.newPassword });
      setView('success');
      setTimeout(() => router.push('/login'), SUCCESS_REDIRECT_DELAY_MS);
    } catch (error) {
      if (error instanceof ApiError && LINK_INVALID_CODES.has(error.code ?? '')) {
        setView('linkInvalid');
      } else if (error instanceof ApiError && error.code === 'PASSWORD_SAME_AS_OLD') {
        setFieldErrors({ newPassword: error.message });
      } else if (error instanceof ApiError) {
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

  return { values, fieldErrors, bannerError, view, isSubmitting, updateField, submit };
}
