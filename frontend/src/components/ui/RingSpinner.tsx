export interface RingSpinnerProps {
  sizeClassName?: string;
}

export function RingSpinner({ sizeClassName = 'h-5 w-5' }: RingSpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Đang xử lý"
      className={`inline-block ${sizeClassName} animate-spin rounded-full border-2 border-white/30 border-t-neon-cyan`}
    />
  );
}
