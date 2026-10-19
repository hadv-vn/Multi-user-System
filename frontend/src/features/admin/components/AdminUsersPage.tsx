'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Pagination } from '@/components/ui/Pagination';
import { StatusResultCard } from '@/components/ui/StatusResultCard';
import type { AdminUserListItem } from '@/lib/admin/admin-api';
import type { UserRole } from '@/lib/session/authenticated-user.types';
import { useAdminUsersList } from '../hooks/use-admin-users-list';
import type { LockUnlockAction } from '../hooks/use-lock-unlock-user';
import { ChangeRoleDialog } from './ChangeRoleDialog';
import { LockUnlockConfirmDialog } from './LockUnlockConfirmDialog';
import { UsersSearchBox } from './UsersSearchBox';
import { UsersTable } from './UsersTable';

interface LockUnlockDialogState {
  row: AdminUserListItem;
  action: LockUnlockAction;
}

export function AdminUsersPage() {
  const router = useRouter();
  const { viewState, searchInput, page, totalPages, updateSearchInput, setPage, retry, updateItemInPlace } =
    useAdminUsersList();
  const [lockUnlockDialog, setLockUnlockDialog] = useState<LockUnlockDialogState | null>(null);
  const [changeRoleRow, setChangeRoleRow] = useState<AdminUserListItem | null>(null);

  if (viewState.kind === 'forbidden') {
    return (
      <StatusResultCard
        icon="error"
        title="Không đủ quyền truy cập"
        description="Bạn không có quyền truy cập trang này."
        primaryAction={{ label: 'Về trang hồ sơ cá nhân', onClick: () => router.push('/profile') }}
      />
    );
  }

  if (viewState.kind === 'error') {
    return (
      <StatusResultCard
        icon="error"
        title="Không thể tải danh sách người dùng"
        description={viewState.message}
        primaryAction={{ label: 'Thử lại', onClick: retry }}
      />
    );
  }

  const isLoading = viewState.kind === 'loading';
  const rows = viewState.kind === 'success' ? viewState.items : [];
  const emptyState =
    viewState.kind === 'empty' ? (
      <div className="text-slate-400">
        <p>Không tìm thấy người dùng nào khớp với &quot;{searchInput}&quot;.</p>
        <p className="mt-1 text-sm">Thử từ khóa khác hoặc xóa bộ lọc tìm kiếm.</p>
        {searchInput ? (
          <button
            type="button"
            onClick={() => updateSearchInput('')}
            className="mt-3 text-sm text-neon-cyan hover:underline"
          >
            Xóa tìm kiếm
          </button>
        ) : null}
      </div>
    ) : undefined;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-heading text-xl font-semibold text-slate-100">Quản trị người dùng</h1>

      <UsersSearchBox
        value={searchInput}
        onChange={updateSearchInput}
        onClear={() => updateSearchInput('')}
      />

      <UsersTable
        rows={rows}
        isLoading={isLoading}
        emptyState={emptyState}
        onRequestLock={(row) => setLockUnlockDialog({ row, action: 'lock' })}
        onRequestUnlock={(row) => setLockUnlockDialog({ row, action: 'unlock' })}
        onRequestChangeRole={(row) => setChangeRoleRow(row)}
      />

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} disabled={isLoading} />

      <LockUnlockConfirmDialog
        isOpen={lockUnlockDialog !== null}
        userId={lockUnlockDialog?.row.id ?? null}
        email={lockUnlockDialog?.row.email ?? ''}
        action={lockUnlockDialog?.action ?? 'lock'}
        onCancel={() => setLockUnlockDialog(null)}
        onSuccess={(result) => {
          updateItemInPlace(result);
          setLockUnlockDialog(null);
        }}
      />

      <ChangeRoleDialog
        isOpen={changeRoleRow !== null}
        userId={changeRoleRow?.id ?? null}
        email={changeRoleRow?.email ?? ''}
        currentRole={changeRoleRow?.role ?? ('USER' as UserRole)}
        onCancel={() => setChangeRoleRow(null)}
        onSuccess={(result) => {
          updateItemInPlace(result);
          setChangeRoleRow(null);
        }}
      />
    </div>
  );
}
