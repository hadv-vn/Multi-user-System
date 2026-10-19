import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { RoleBadge } from '@/components/ui/RoleBadge';
import type { AdminUserListItem } from '@/lib/admin/admin-api';
import type { AccountStatus } from '@/lib/session/authenticated-user.types';

export interface UsersTableProps {
  rows: AdminUserListItem[];
  isLoading: boolean;
  emptyState?: React.ReactNode;
  onRequestLock: (row: AdminUserListItem) => void;
  onRequestUnlock: (row: AdminUserListItem) => void;
  onRequestChangeRole: (row: AdminUserListItem) => void;
}

const STATUS_LABEL: Record<AccountStatus, string> = {
  ACTIVE: 'Hoạt động',
  LOCKED: 'Đã khóa',
  PENDING_VERIFICATION: 'Chưa xác thực email',
  DEACTIVATED: 'Đã vô hiệu hóa',
};

const STATUS_DOT_CLASS: Record<AccountStatus, string> = {
  ACTIVE: 'bg-neon-success',
  LOCKED: 'bg-neon-danger',
  PENDING_VERIFICATION: 'bg-neon-warning',
  DEACTIVATED: 'bg-slate-500',
};

export function UsersTable({
  rows,
  isLoading,
  emptyState,
  onRequestLock,
  onRequestUnlock,
  onRequestChangeRole,
}: UsersTableProps) {
  const columns: DataTableColumn<AdminUserListItem>[] = [
    { key: 'email', header: 'Email', render: (row) => row.email },
    {
      key: 'role',
      header: 'Vai trò',
      render: (row) => <RoleBadge role={row.role} />,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (row) => (
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className={`h-2 w-2 rounded-full ${STATUS_DOT_CLASS[row.status]}`} />
          {STATUS_LABEL[row.status]}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Hành động',
      render: (row) => {
        const isDeactivated = row.status === 'DEACTIVATED';
        return (
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isDeactivated}
              onClick={() => (row.status === 'LOCKED' ? onRequestUnlock(row) : onRequestLock(row))}
              title={isDeactivated ? 'Tài khoản đã vô hiệu hóa, không áp dụng khóa/mở khóa.' : undefined}
              aria-label={`${row.status === 'LOCKED' ? 'Mở khóa' : 'Khóa'} tài khoản ${row.email}`}
              className="rounded-lg border border-white/15 px-2.5 py-1 text-xs text-slate-200 transition-colors hover:border-neon-cyan/50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {row.status === 'LOCKED' ? 'Mở khóa' : 'Khóa'}
            </button>
            <button
              type="button"
              onClick={() => onRequestChangeRole(row)}
              aria-label={`Đổi vai trò cho ${row.email}`}
              className="rounded-lg border border-white/15 px-2.5 py-1 text-xs text-slate-200 transition-colors hover:border-neon-cyan/50"
            >
              Đổi vai trò
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(row) => row.id}
      isLoading={isLoading}
      emptyState={emptyState}
    />
  );
}
