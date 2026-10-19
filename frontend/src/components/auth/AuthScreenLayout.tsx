import type { ReactNode } from 'react';

export interface AuthScreenLayoutProps {
  children: ReactNode;
}

/** Khung nền + logo dùng chung cho mọi màn hình vùng Auth (S1–S6). */
export function AuthScreenLayout({ children }: AuthScreenLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 font-heading text-lg font-semibold tracking-wide text-slate-200">
        Multi-User System
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
