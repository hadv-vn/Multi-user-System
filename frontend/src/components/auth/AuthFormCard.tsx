import type { ReactNode } from 'react';

import { GlassCard } from '../ui/GlassCard';
import { AuthScreenLayout } from './AuthScreenLayout';

export interface AuthFormCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footerSlot?: ReactNode;
}

export function AuthFormCard({ title, subtitle, children, footerSlot }: AuthFormCardProps) {
  return (
    <AuthScreenLayout>
      <GlassCard>
        <h1 className="mb-1.5 text-center font-heading text-2xl font-semibold text-slate-100">
          {title}
        </h1>
        {subtitle ? <p className="mb-6 text-center text-sm text-slate-400">{subtitle}</p> : null}
        <div className={subtitle ? '' : 'mt-6'}>{children}</div>
      </GlassCard>
      {footerSlot ? <div className="mt-5 text-center text-sm text-slate-400">{footerSlot}</div> : null}
    </AuthScreenLayout>
  );
}
