import type { ReactNode } from 'react';

import { RingSpinner } from './RingSpinner';

export interface PrimaryButtonProps {
  children: ReactNode;
  type?: 'submit' | 'button';
  isLoading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

export function PrimaryButton({
  children,
  type = 'button',
  isLoading = false,
  disabled = false,
  onClick,
  className = '',
}: PrimaryButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      className={`inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-neon-cyan to-neon-violet px-4 py-2.5 font-medium text-slate-950 transition-all duration-180 ease-out hover:shadow-[0_0_20px_rgba(34,211,238,0.5)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {isLoading ? <RingSpinner sizeClassName="h-5 w-5 border-slate-950/30 border-t-slate-950" /> : children}
    </button>
  );
}
