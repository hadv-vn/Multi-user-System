import Link from 'next/link';

import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { RoleBadge } from '@/components/ui/RoleBadge';
import type { AdminUserListItem } from '@/lib/admin/admin-api';
import { AccountStatusIndicator } from './AccountStatusIndicator';

export interface UsersTableProps {
  rows: AdminUserListItem[];
  isLoading: boolean;
  emptyState?: React.ReactNode;
  onRequestLock: (row: AdminUserListItem) => void;
  onRequestUnlock: (row: AdminUserListItem) => void;
  onRequestChangeRole: (row: AdminUserListItem) => void;
}

export function UsersTable({
  rows,
  isLoading,
  emptyState,
  onRequestLock,
  onRequestUnlock,
  onRequestChangeRole,
}: UsersTableProps) {
  const columns: DataTableColumn<AdminUserListItem>[] = [
    {
      key: 'email',
      header: 'Email',
      render: (row) => (
        <Link
          href={`/admin/users/${row.id}`}
          aria-label={`Xem chi tiết tài khoản ${row.email}`}
          className="text-slate-100 transition-colors hover:text-neon-cyan hover:underline"
        >
          {row.email}
        </Link>
      ),
    },
    {
      key: 'role',
      header: 'Vai trò',
      render: (row) => <RoleBadge role={row.role} />,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (row) => <AccountStatusIndicator status={row.status} />,
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
