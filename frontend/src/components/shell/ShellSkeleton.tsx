export function ShellSkeleton() {
  return (
    <div className="flex min-h-screen flex-col" role="status" aria-label="Đang tải">
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div className="skeleton-shimmer h-5 w-40 rounded" />
        <div className="skeleton-shimmer h-9 w-9 rounded-full" />
      </div>
      <div className="flex flex-1">
        <div className="w-56 border-r border-white/10 p-4">
          <div className="skeleton-shimmer mb-3 h-8 w-full rounded" />
          <div className="skeleton-shimmer h-8 w-full rounded" />
        </div>
        <div className="flex-1 p-6">
          <div className="skeleton-shimmer h-40 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
