'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { handleUnauthenticatedGlobally } from '@/features/session/hooks/handle-unauthenticated';
import { adminApi, type ChangeRoleResult } from '@/lib/admin/admin-api';
import { useToast } from '@/components/ui/toast/use-toast';
import { displayMessageFor } from '@/lib/auth/auth-error-display';
import { ApiError } from '@/lib/http/api-error';
import type { UserRole } from '@/lib/session/authenticated-user.types';
import { useSession } from '@/lib/session/use-session';

export function useChangeRole() {
  const router = useRouter();
  const { clearSession } = useSession();
  const { showSuccess } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);

  async function submit(userId: string, newRole: UserRole): Promise<ChangeRoleResult | null> {
    setBannerError(null);
    setIsSubmitting(true);
    try {
      const result = await adminApi.changeRole(userId, newRole);
      showSuccess('Đã đổi vai trò.');
      return result;
    } catch (error) {
      if (handleUnauthenticatedGlobally(error, clearSession, router)) {
        return null;
      }
      setBannerError(error instanceof ApiError ? displayMessageFor(error) : 'Đã có lỗi xảy ra, vui lòng thử lại sau.');
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
