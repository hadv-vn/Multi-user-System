'use client';

import { useRouter } from 'next/navigation';

import { GlassCard } from '@/components/ui/GlassCard';
import { Pagination } from '@/components/ui/Pagination';
import { StatusResultCard } from '@/components/ui/StatusResultCard';
import { UsersSearchBox } from '@/features/admin/components/UsersSearchBox';
import type { TaskStatusSummary } from '@/lib/admin-task-stats/admin-task-stats-api';
import { useTaskStatsOverview } from '../hooks/use-task-stats-overview';
import { TaskCompletionBar } from './TaskCompletionBar';
import { TaskStatsUsersTable } from './TaskStatsUsersTable';
import { TaskStatTile } from './TaskStatTile';

export function TaskStatsOverviewPage() {
  const router = useRouter();
  const { viewState, searchInput, page, totalPages, updateSearchInput, setPage, retry } = useTaskStatsOverview();

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
        title="Không thể tải thống kê công việc"
        description={viewState.message}
        primaryAction={{ label: 'Thử lại', onClick: retry }}
      />
    );
  }

  const isLoading = viewState.kind === 'loading';
  const rows = viewState.kind === 'success' ? viewState.items : [];
  const summary = viewState.kind === 'success' || viewState.kind === 'empty' ? viewState.summary : null;
  const emptyState =
    viewState.kind === 'empty' ? (
      <div className="text-slate-400">
        <p>{searchInput ? `Không tìm thấy người dùng nào khớp với "${searchInput}".` : 'Chưa có người dùng nào.'}</p>
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
      <h1 className="font-heading text-xl font-semibold text-slate-100">Thống kê công việc</h1>

      <SystemSummaryCard summary={summary} />

      <UsersSearchBox value={searchInput} onChange={updateSearchInput} onClear={() => updateSearchInput('')} />

      <TaskStatsUsersTable rows={rows} isLoading={isLoading} emptyState={emptyState} />

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} disabled={isLoading} />

      <p className="text-xs text-slate-500">
        ⓘ Chỉ hiển thị số liệu tổng hợp. Nội dung công việc là dữ liệu riêng tư của người dùng, quản trị viên không
        xem được.
      </p>
    </div>
  );
}

/** `summary = null` khi đang tải: giữ khung, hiện dấu "—" thay vì nháy layout. */
function SystemSummaryCard({ summary }: { summary: TaskStatusSummary | null }) {
  const placeholder = '—';

  return (
    <GlassCard className="p-6">
      <h2 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wider text-neon-cyan">
        Toàn hệ thống
      </h2>
      <div className="grid grid-cols-3 gap-3">
        <TaskStatTile label="Tổng" value={summary?.total ?? placeholder} />
        <TaskStatTile label="Đang mở" value={summary?.byStatus.open ?? placeholder} accentClassName="text-neon-warning" />
        <TaskStatTile label="Hoàn thành" value={summary?.byStatus.done ?? placeholder} accentClassName="text-neon-success" />
      </div>
      {summary && summary.total > 0 ? (
        <TaskCompletionBar done={summary.byStatus.done} total={summary.total} className="mt-4" />
      ) : null}
    </GlassCard>
  );
}
