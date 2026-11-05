import Link from 'next/link';

import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import type { TaskStatsOverviewUser } from '@/lib/admin-task-stats/admin-task-stats-api';
import { calculateDonePercent, TaskCompletionBar } from './TaskCompletionBar';

export interface TaskStatsUsersTableProps {
  rows: TaskStatsOverviewUser[];
  isLoading: boolean;
  emptyState?: React.ReactNode;
}

const NUMBER_CELL_CLASS = 'tabular-nums';

export function TaskStatsUsersTable({ rows, isLoading, emptyState }: TaskStatsUsersTableProps) {
  const columns: DataTableColumn<TaskStatsOverviewUser>[] = [
    {
      key: 'email',
      header: 'Email',
      render: (row) => (
        <Link
          href={`/admin/users/${row.userId}`}
          aria-label={`Xem chi tiết tài khoản ${row.email}`}
          className="text-slate-100 transition-colors hover:text-neon-cyan hover:underline"
        >
          {row.email}
        </Link>
      ),
    },
    { key: 'total', header: 'Tổng', render: (row) => <span className={NUMBER_CELL_CLASS}>{row.total}</span> },
    {
      key: 'open',
      header: 'Đang mở',
      render: (row) => <span className={`${NUMBER_CELL_CLASS} text-neon-warning`}>{row.byStatus.open}</span>,
    },
    {
      key: 'done',
      header: 'Hoàn thành',
      render: (row) => <span className={`${NUMBER_CELL_CLASS} text-neon-success`}>{row.byStatus.done}</span>,
    },
    {
      key: 'completion',
      header: 'Tỉ lệ hoàn thành',
      render: (row) =>
        row.total === 0 ? (
          <span className="text-slate-500">—</span>
        ) : (
          <div className="flex min-w-32 items-center gap-2">
            <TaskCompletionBar done={row.byStatus.done} total={row.total} variant="compact" className="flex-1" />
            <span className={`${NUMBER_CELL_CLASS} w-10 text-right text-xs text-slate-400`}>
              {calculateDonePercent(row.byStatus.done, row.total)}%
            </span>
          </div>
        ),
    },
  ];

  return (
    <DataTable columns={columns} rows={rows} rowKey={(row) => row.userId} isLoading={isLoading} emptyState={emptyState} />
  );
}
