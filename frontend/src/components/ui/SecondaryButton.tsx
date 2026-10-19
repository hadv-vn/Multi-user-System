import type { ReactNode } from 'react';

export interface SecondaryButtonProps {
  children: ReactNode;
  type?: 'submit' | 'button';
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

export function SecondaryButton({
  children,
  type = 'button',
  disabled = false,
  onClick,
  className = '',
}: SecondaryButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex w-full items-center justify-center rounded-xl border border-white/15 bg-transparent px-4 py-2.5 font-medium text-slate-200 transition-colors duration-180 ease-out hover:border-neon-cyan/50 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}
