'use client';

import { useState } from 'react';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SelectField } from '@/components/ui/SelectField';
import type { ChangeRoleResult } from '@/lib/admin/admin-api';
import type { UserRole } from '@/lib/session/authenticated-user.types';
import { useChangeRole } from '../hooks/use-change-role';

export interface ChangeRoleDialogProps {
  isOpen: boolean;
  userId: string | null;
  email: string;
  currentRole: UserRole;
  onCancel: () => void;
  onSuccess: (result: ChangeRoleResult) => void;
}

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'USER', label: 'USER' },
  { value: 'ADMIN', label: 'ADMIN' },
];

export function ChangeRoleDialog({
  isOpen,
  userId,
  email,
  currentRole,
  onCancel,
  onSuccess,
}: ChangeRoleDialogProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>(
    currentRole === 'ADMIN' ? 'USER' : 'ADMIN',
  );
  const { isSubmitting, bannerError, submit } = useChangeRole();

  // Đặt lại lựa chọn mỗi khi dialog mở lại (có thể cho dòng khác với
  // currentRole khác) — tính trong lúc render, không dùng effect (xem
  // use-admin-users-list.ts cho cùng pattern).
  const [trackedOpenState, setTrackedOpenState] = useState({ isOpen, currentRole });
  if (isOpen !== trackedOpenState.isOpen || currentRole !== trackedOpenState.currentRole) {
    setTrackedOpenState({ isOpen, currentRole });
    if (isOpen) {
      setSelectedRole(currentRole === 'ADMIN' ? 'USER' : 'ADMIN');
    }
  }

  async function handleConfirm(): Promise<void> {
    if (!userId) return;
    const result = await submit(userId, selectedRole);
    if (result) {
      onSuccess(result);
    }
  }

  return (
    <ConfirmDialog
      isOpen={isOpen}
      title={`Đổi vai trò cho ${email}`}
      confirmLabel="Xác nhận thay đổi"
      isConfirmDisabled={selectedRole === currentRole}
      isLoading={isSubmitting}
      bannerError={bannerError ?? undefined}
      onConfirm={() => void handleConfirm()}
      onCancel={onCancel}
    >
      <SelectField
        id="change-role-select"
        label="Vai trò mới"
        value={selectedRole}
        options={ROLE_OPTIONS}
        onChange={setSelectedRole}
        error={selectedRole === currentRole ? 'Vui lòng chọn một vai trò khác vai trò hiện tại' : undefined}
      />
    </ConfirmDialog>
  );
}
