import type { ReactNode } from 'react';

export interface UserDetailFieldProps {
  label: string;
  children: ReactNode;
}

/** Một cặp nhãn–giá trị trong các thẻ chi tiết người dùng (dùng trong `<dl>`). */
export function UserDetailField({ label, children }: UserDetailFieldProps) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-white/5 py-2 last:border-b-0">
      <dt className="text-sm text-slate-400">{label}</dt>
      <dd className="text-right text-sm text-slate-100">{children}</dd>
    </div>
  );
}
