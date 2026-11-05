export interface TaskCompletionBarProps {
  done: number;
  total: number;
  /** `compact`: thanh mảnh, không có dòng chú thích — dùng trong ô bảng. */
  variant?: 'default' | 'compact';
  className?: string;
}

export function calculateDonePercent(done: number, total: number): number {
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

export function TaskCompletionBar({ done, total, variant = 'default', className = '' }: TaskCompletionBarProps) {
  const donePercent = calculateDonePercent(done, total);
  const isCompact = variant === 'compact';

  return (
    <div className={className}>
      <div
        role="progressbar"
        aria-label="Tỉ lệ công việc hoàn thành"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={donePercent}
        className={`overflow-hidden rounded-full bg-white/10 ${isCompact ? 'h-1.5' : 'h-2'}`}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-neon-cyan to-neon-success shadow-[0_0_10px_rgba(52,211,153,0.5)] transition-[width] duration-500 ease-out"
          style={{ width: `${donePercent}%` }}
        />
      </div>
      {isCompact ? null : <p className="mt-1.5 text-xs text-slate-400">{donePercent}% hoàn thành</p>}
    </div>
  );
}
