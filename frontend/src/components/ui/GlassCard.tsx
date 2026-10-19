import type { ReactNode } from 'react';

export interface GlassCardProps {
  children: ReactNode;
  variant?: 'default' | 'danger';
  className?: string;
}

const VARIANT_BORDER_CLASS: Record<NonNullable<GlassCardProps['variant']>, string> = {
  default: 'border-border-glass',
  danger: 'border-neon-danger/40',
};

export function GlassCard({ children, variant = 'default', className = '' }: GlassCardProps) {
  return (
    <div
      className={`rounded-2xl border bg-surface-glass p-8 shadow-lg shadow-black/40 backdrop-blur-xl transition-colors duration-180 ${VARIANT_BORDER_CLASS[variant]} ${className}`}
    >
      {children}
    </div>
  );
}
