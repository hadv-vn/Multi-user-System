import { GlassCard } from './GlassCard';
import { PrimaryButton } from './PrimaryButton';
import { RingSpinner } from './RingSpinner';
import { SecondaryButton } from './SecondaryButton';

export type StatusResultIcon = 'success' | 'warning' | 'error' | 'loading';

export interface StatusResultAction {
  label: string;
  onClick: () => void;
}

export interface StatusResultCardProps {
  icon: StatusResultIcon;
  title: string;
  description: string;
  primaryAction?: StatusResultAction;
  secondaryAction?: StatusResultAction;
}

const ICON_CLASS: Record<StatusResultIcon, string> = {
  success: 'text-neon-success',
  warning: 'text-neon-warning',
  error: 'text-neon-danger',
  loading: 'text-neon-cyan',
};

const ICON_GLYPH: Record<StatusResultIcon, string> = {
  success: '✓',
  warning: '⚠',
  error: '✕',
  loading: '',
};

export function StatusResultCard({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
}: StatusResultCardProps) {
  return (
    <GlassCard className="flex flex-col items-center text-center">
      <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-full border-2 text-2xl ${ICON_CLASS[icon]} border-current/40`}>
        {icon === 'loading' ? <RingSpinner sizeClassName="h-7 w-7" /> : ICON_GLYPH[icon]}
      </div>
      <h2 className="mb-2 text-xl font-semibold text-slate-100">{title}</h2>
      <p className="mb-6 text-sm text-slate-400">{description}</p>
      {primaryAction ? (
        <PrimaryButton onClick={primaryAction.onClick} className="mb-3">
          {primaryAction.label}
        </PrimaryButton>
      ) : null}
      {secondaryAction ? (
        <SecondaryButton onClick={secondaryAction.onClick}>{secondaryAction.label}</SecondaryButton>
      ) : null}
    </GlassCard>
  );
}
