'use client';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { LockUnlockResult } from '@/lib/admin/admin-api';
import { useLockUnlockUser, type LockUnlockAction } from '../hooks/use-lock-unlock-user';

export interface LockUnlockConfirmDialogProps {
  isOpen: boolean;
  userId: string | null;
  email: string;
  action: LockUnlockAction;
  onCancel: () => void;
  onSuccess: (result: LockUnlockResult) => void;
}

const TITLE: Record<LockUnlockAction, string> = {
  lock: 'Xác nhận khóa tài khoản',
  unlock: 'Xác nhận mở khóa tài khoản',
};

const DESCRIPTION: Record<LockUnlockAction, string> = {
  lock: 'Mọi phiên đăng nhập hiện tại của tài khoản này sẽ bị thu hồi ngay.',
  unlock: 'Tài khoản sẽ có thể đăng nhập lại ngay sau khi mở khóa.',
};

export function LockUnlockConfirmDialog({
  isOpen,
  userId,
  email,
  action,
  onCancel,
  onSuccess,
}: LockUnlockConfirmDialogProps) {
  const { isSubmitting, bannerError, submit } = useLockUnlockUser();

  async function handleConfirm(): Promise<void> {
    if (!userId) return;
    const result = await submit(userId, action);
    if (result) {
      onSuccess(result);
    }
  }

  return (
    <ConfirmDialog
      isOpen={isOpen}
      title={`${TITLE[action]} ${email}`}
      description={DESCRIPTION[action]}
      confirmLabel="Xác nhận"
      isLoading={isSubmitting}
      bannerError={bannerError?.message}
      countdownSeconds={bannerError?.countdownSeconds}
      onConfirm={() => void handleConfirm()}
      onCancel={onCancel}
    />
  );
}
