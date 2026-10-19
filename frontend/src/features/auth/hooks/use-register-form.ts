'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { displayMessageFor, hasCountdown } from '@/lib/auth/auth-error-display';
import { authApi } from '@/lib/auth/auth-api';
import { ApiError } from '@/lib/http/api-error';
import { isEmailValid } from '@/lib/validation/email-rule';
import { isPasswordValid, PASSWORD_WEAK_MESSAGE } from '@/lib/validation/password-rules';

export interface RegisterFormValues {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface RegisterFormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export interface RegisterBannerError {
  message: string;
  countdownSeconds?: number;
}

const INITIAL_VALUES: RegisterFormValues = { email: '', password: '', confirmPassword: '' };

function validateRegisterForm(values: RegisterFormValues): RegisterFormErrors {
  const errors: RegisterFormErrors = {};

  if (!values.email) {
    errors.email = 'Vui lòng nhập email';
  } else if (!isEmailValid(values.email)) {
    errors.email = 'Email không đúng định dạng, ví dụ: ten@vidu.com';
  }

  if (!values.password) {
    errors.password = 'Vui lòng nhập mật khẩu';
  } else if (!isPasswordValid(values.password)) {
    errors.password = PASSWORD_WEAK_MESSAGE;
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = 'Vui lòng nhập lại mật khẩu';
  } else if (values.confirmPassword !== values.password) {
    errors.confirmPassword = 'Mật khẩu xác nhận không khớp';
  }

  return errors;
}

export function useRegisterForm() {
  const router = useRouter();
  const [values, setValues] = useState<RegisterFormValues>(INITIAL_VALUES);
  const [fieldErrors, setFieldErrors] = useState<RegisterFormErrors>({});
  const [bannerError, setBannerError] = useState<RegisterBannerError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(field: keyof RegisterFormValues, value: string): void {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function submit(): Promise<void> {
    const errors = validateRegisterForm(values);
    setFieldErrors(errors);
    setBannerError(null);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.register({ email: values.email, password: values.password });
      router.push(`/register/check-email?email=${encodeURIComponent(values.email)}`);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'EMAIL_ALREADY_REGISTERED') {
        setFieldErrors({ email: error.message });
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

  return { values, fieldErrors, bannerError, isSubmitting, updateField, submit };
}
