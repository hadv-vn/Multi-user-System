export interface UsersSearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
}

export function UsersSearchBox({ value, onChange, onClear }: UsersSearchBoxProps) {
  return (
    <div className="relative max-w-sm">
      <span aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
        🔍
      </span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Tìm theo email"
        aria-label="Tìm người dùng theo email"
        className="w-full rounded-xl border border-white/15 bg-transparent px-9 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-neon-cyan"
      />
      {value ? (
        <button
          type="button"
          onClick={onClear}
          aria-label="Xóa tìm kiếm"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200"
        >
          ✕
        </button>
      ) : null}
    </div>
  );
}
