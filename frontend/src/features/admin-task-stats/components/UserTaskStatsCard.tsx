'use client';

import { GlassCard } from '@/components/ui/GlassCard';
import { RingSpinner } from '@/components/ui/RingSpinner';
import type { UserTaskStats } from '@/lib/admin-task-stats/admin-task-stats-api';
import { formatDateTime } from '@/lib/utils/format-date-time';
import { useUserTaskStats } from '../hooks/use-user-task-stats';
import { TaskStatTile } from './TaskStatTile';

export interface UserTaskStatsCardProps {
  userId: string;
}

export function UserTaskStatsCard({ userId }: UserTaskStatsCardProps) {
  const { viewState, retry } = useUserTaskStats(userId);

  return (
    <GlassCard className="p-6">
      <h2 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wider text-neon-cyan">
        Thống kê công việc
      </h2>

      {viewState.kind === 'loading' ? (
        <div className="flex justify-center py-6">
          <RingSpinner sizeClassName="h-6 w-6" />
        </div>
      ) : null}

      {viewState.kind === 'error' ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 text-sm text-neon-danger">
          <span>⚠ {viewState.message}</span>
          <button type="button" onClick={retry} className="text-neon-cyan hover:underline">
            Thử lại
          </button>
        </div>
      ) : null}

      {viewState.kind === 'success' ? <TaskStatsContent stats={viewState.stats} /> : null}

      <p className="mt-4 text-xs text-slate-500">
        ⓘ Nội dung công việc là dữ liệu riêng tư của người dùng, quản trị viên không xem được.
      </p>
    </GlassCard>
  );
}

function TaskStatsContent({ stats }: { stats: UserTaskStats }) {
  if (stats.total === 0) {
    return <p className="py-4 text-sm text-slate-400">Người dùng chưa tạo công việc nào.</p>;
  }

  const donePercent = Math.round((stats.byStatus.done / stats.total) * 100);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <TaskStatTile label="Tổng" value={stats.total} />
        <TaskStatTile label="Đang mở" value={stats.byStatus.open} accentClassName="text-neon-warning" />
        <TaskStatTile label="Hoàn thành" value={stats.byStatus.done} accentClassName="text-neon-success" />
        <TaskStatTile label="Tạo gần nhất" value={formatDateTime(stats.lastCreatedAt)} size="compact" />
      </div>

      <div className="mt-4">
        <div
          role="progressbar"
          aria-label="Tỉ lệ công việc hoàn thành"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={donePercent}
          className="h-2 overflow-hidden rounded-full bg-white/10"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-neon-cyan to-neon-success shadow-[0_0_10px_rgba(52,211,153,0.5)] transition-[width] duration-500 ease-out"
            style={{ width: `${donePercent}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs text-slate-400">{donePercent}% hoàn thành</p>
      </div>
    </>
  );
}
