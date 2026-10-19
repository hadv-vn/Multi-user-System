'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useToast } from '@/components/ui/toast/use-toast';
import { accountApi } from '@/lib/account/account-api';
import { handleUnauthenticatedGlobally } from '@/features/session/hooks/handle-unauthenticated';
import { ApiError } from '@/lib/http/api-error';
import { useSession } from '@/lib/session/use-session';
import { isPasswordValid, PASSWORD_WEAK_MESSAGE } from '@/lib/validation/password-rules';

export interface ChangePasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface ChangePasswordFormErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmNewPassword?: string;
}

const INITIAL_VALUES: ChangePasswordFormValues = {
  currentPassword: '',
  newPassword: '',
  confirmNewPassword: '',
};

function validate(values: ChangePasswordFormValues): ChangePasswordFormErrors {
  const errors: ChangePasswordFormErrors = {};

  if (!values.currentPassword) {
    errors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại';
  }

  if (!values.newPassword) {
    errors.newPassword = 'Vui lòng nhập mật khẩu mới';
  } else if (!isPasswordValid(values.newPassword)) {
    errors.newPassword = PASSWORD_WEAK_MESSAGE;
  }

  if (!values.confirmNewPassword) {
    errors.confirmNewPassword = 'Vui lòng nhập lại mật khẩu mới';
  } else if (values.confirmNewPassword !== values.newPassword) {
    errors.confirmNewPassword = 'Mật khẩu xác nhận không khớp';
  }

  return errors;
}

export function useChangePasswordForm() {
  const router = useRouter();
  const { clearSession } = useSession();
  const { showSuccess } = useToast();
  const [values, setValues] = useState<ChangePasswordFormValues>(INITIAL_VALUES);
  const [fieldErrors, setFieldErrors] = useState<ChangePasswordFormErrors>({});
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(field: keyof ChangePasswordFormValues, value: string): void {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function submit(): Promise<void> {
    const errors = validate(values);
    setFieldErrors(errors);
    setBannerError(null);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await accountApi.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      showSuccess('Đổi mật khẩu thành công.');
      setValues(INITIAL_VALUES);
    } catch (error) {
      if (handleUnauthenticatedGlobally(error, clearSession, router)) {
        return;
      }
      if (error instanceof ApiError && error.code === 'CURRENT_PASSWORD_INCORRECT') {
        setFieldErrors({ currentPassword: error.message });
      } else if (error instanceof ApiError && error.code === 'PASSWORD_SAME_AS_OLD') {
        setFieldErrors({ newPassword: error.message });
      } else {
        setBannerError('Đã có lỗi xảy ra, vui lòng thử lại sau.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return { values, fieldErrors, bannerError, isSubmitting, updateField, submit };
}
