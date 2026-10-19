import type { ReactNode } from 'react';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  isLoading?: boolean;
  skeletonRowCount?: number;
  emptyState?: ReactNode;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  isLoading = false,
  skeletonRowCount = 5,
  emptyState,
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border-glass">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 text-slate-400">
            {columns.map((column) => (
              <th key={column.key} scope="col" className="px-4 py-3 font-medium">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading
            ? Array.from({ length: skeletonRowCount }).map((_, rowIndex) => (
                <tr key={`skeleton-${rowIndex}`} className="border-b border-white/5">
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-3">
                      <div className="skeleton-shimmer h-4 w-full max-w-[160px] rounded" />
                    </td>
                  ))}
                </tr>
              ))
            : rows.map((row) => (
                <tr key={rowKey(row)} className="border-b border-white/5 text-slate-200">
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-3">
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
      {!isLoading && rows.length === 0 && emptyState ? (
        <div className="px-4 py-8 text-center">{emptyState}</div>
      ) : null}
    </div>
  );
}
