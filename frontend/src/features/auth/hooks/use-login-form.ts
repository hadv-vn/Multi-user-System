'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { authApi } from '@/lib/auth/auth-api';
import { displayMessageFor, hasCountdown } from '@/lib/auth/auth-error-display';
import { ApiError } from '@/lib/http/api-error';
import { useSession } from '@/lib/session/use-session';
import { isEmailValid } from '@/lib/validation/email-rule';

export interface LoginFormValues {
  email: string;
  password: string;
}

export interface LoginFormErrors {
  email?: string;
  password?: string;
}

export interface LoginBannerError {
  message: string;
  variant: 'error' | 'warning';
  countdownSeconds?: number;
  showResendVerificationAction: boolean;
}

const INITIAL_VALUES: LoginFormValues = { email: '', password: '' };

function validateLoginForm(values: LoginFormValues): LoginFormErrors {
  const errors: LoginFormErrors = {};

  if (!values.email) {
    errors.email = 'Vui lòng nhập email';
  } else if (!isEmailValid(values.email)) {
    errors.email = 'Email không đúng định dạng';
  }

  if (!values.password) {
    errors.password = 'Vui lòng nhập mật khẩu';
  }

  return errors;
}

export function useLoginForm() {
  const router = useRouter();
  const { setSession } = useSession();
  const [values, setValues] = useState<LoginFormValues>(INITIAL_VALUES);
  const [fieldErrors, setFieldErrors] = useState<LoginFormErrors>({});
  const [bannerError, setBannerError] = useState<LoginBannerError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(field: keyof LoginFormValues, value: string): void {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function submit(): Promise<void> {
    const errors = validateLoginForm(values);
    setFieldErrors(errors);
    setBannerError(null);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await authApi.login(values);
      setSession(user);
      router.push('/profile');
    } catch (error) {
      if (error instanceof ApiError) {
        setBannerError(mapLoginErrorToBanner(error));
      } else {
        setBannerError({
          message: 'Đã có lỗi xảy ra, vui lòng thử lại sau.',
          variant: 'error',
          showResendVerificationAction: false,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return { values, fieldErrors, bannerError, isSubmitting, updateField, submit };
}

function mapLoginErrorToBanner(error: ApiError): LoginBannerError {
  const message = displayMessageFor(error);

  if (error.code === 'ACCOUNT_TEMPORARILY_LOCKED') {
    return {
      message,
      variant: 'warning',
      countdownSeconds: hasCountdown(error) ? error.retryAfterSeconds : undefined,
      showResendVerificationAction: false,
    };
  }

  if (error.code === 'ACCOUNT_EMAIL_NOT_VERIFIED') {
    return { message, variant: 'error', showResendVerificationAction: true };
  }

  return {
    message,
    variant: 'error',
    countdownSeconds: hasCountdown(error) ? error.retryAfterSeconds : undefined,
    showResendVerificationAction: false,
  };
}
