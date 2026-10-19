'use client';

import { useState } from 'react';

import { Checkbox } from '@/components/ui/Checkbox';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PasswordField } from '@/components/ui/PasswordField';
import { useDeactivateAccount } from '../hooks/use-deactivate-account';

export interface DeactivateConfirmDialogProps {
  isOpen: boolean;
  onCancel: () => void;
}

export function DeactivateConfirmDialog({ isOpen, onCancel }: DeactivateConfirmDialogProps) {
  const [password, setPassword] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const { isSubmitting, bannerError, submit } = useDeactivateAccount();

  function handleCancel(): void {
    setPassword('');
    setAcknowledged(false);
    onCancel();
  }

  return (
    <ConfirmDialog
      isOpen={isOpen}
      title="Xác nhận vô hiệu hóa tài khoản"
      variant="danger"
      confirmLabel="Xác nhận vô hiệu hóa"
      isConfirmDisabled={password === '' || !acknowledged}
      isLoading={isSubmitting}
      bannerError={bannerError?.message}
      countdownSeconds={bannerError?.countdownSeconds}
      onConfirm={() => void submit(password)}
      onCancel={handleCancel}
    >
      <div className="flex flex-col gap-4">
        <PasswordField
          id="deactivate-password"
          label="Nhập lại mật khẩu để xác nhận"
          value={password}
          onChange={setPassword}
          disabled={isSubmitting}
          autoComplete="current-password"
        />
        <Checkbox
          id="deactivate-acknowledge"
          label="Tôi hiểu rằng tài khoản của tôi sẽ bị vô hiệu hóa và tôi sẽ bị đăng xuất ngay lập tức."
          checked={acknowledged}
          onChange={setAcknowledged}
        />
      </div>
    </ConfirmDialog>
  );
}
