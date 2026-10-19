'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useToast } from '@/components/ui/toast/use-toast';
import { accountApi } from '@/lib/account/account-api';
import { handleUnauthenticatedGlobally } from '@/features/session/hooks/handle-unauthenticated';
import { isNameValid, NAME_MAX_LENGTH, NAME_MIN_LENGTH } from '@/lib/validation/name-rule';
import { useSession } from '@/lib/session/use-session';

export function useUpdateProfileForm() {
  const router = useRouter();
  const { currentUser, setSession, clearSession } = useSession();
  const { showSuccess, showError } = useToast();
  const [nameInput, setNameInput] = useState(currentUser?.name ?? '');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateNameInput(value: string): void {
    setNameInput(value);
  }

  async function submit(): Promise<void> {
    if (!isNameValid(nameInput)) {
      setFieldError(
        nameInput.length === 0
          ? 'Vui lòng nhập họ tên'
          : `Họ tên phải có ${NAME_MIN_LENGTH} đến ${NAME_MAX_LENGTH} ký tự`,
      );
      return;
    }
    setFieldError(null);

    setIsSubmitting(true);
    try {
      const profile = await accountApi.updateProfile({ name: nameInput });
      if (currentUser) {
        setSession({ ...currentUser, name: profile.name });
      }
      showSuccess('Đã cập nhật hồ sơ.');
    } catch (error) {
      if (!handleUnauthenticatedGlobally(error, clearSession, router)) {
        showError('Không thể lưu thay đổi, vui lòng thử lại.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return { nameInput, fieldError, isSubmitting, updateNameInput, submit };
}
