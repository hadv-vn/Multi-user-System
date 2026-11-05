export interface TaskStatTileProps {
  label: string;
  value: string | number;
  accentClassName?: string;
  /** `compact` cho giá trị dạng chuỗi dài (vd ngày giờ) thay vì con số. */
  size?: 'large' | 'compact';
}

const VALUE_SIZE_CLASS: Record<NonNullable<TaskStatTileProps['size']>, string> = {
  large: 'text-2xl',
  compact: 'text-base',
};

export function TaskStatTile({
  label,
  value,
  accentClassName = 'text-slate-100',
  size = 'large',
}: TaskStatTileProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
      <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-1 font-heading font-semibold tabular-nums ${VALUE_SIZE_CLASS[size]} ${accentClassName}`}>{value}</p>
    </div>
  );
}
