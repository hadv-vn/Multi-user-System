export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

export function Pagination({ page, totalPages, onPageChange, disabled = false }: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav
      aria-label="Phân trang"
      className="mt-4 flex items-center justify-center gap-4 text-sm text-slate-300"
    >
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={disabled || page <= 1}
        className="rounded-lg border border-white/15 px-3 py-1.5 transition-colors hover:border-neon-cyan/50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Trước
      </button>
      <span>
        Trang {page}/{totalPages}
      </span>
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={disabled || page >= totalPages}
        className="rounded-lg border border-white/15 px-3 py-1.5 transition-colors hover:border-neon-cyan/50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Sau
      </button>
    </nav>
  );
}
