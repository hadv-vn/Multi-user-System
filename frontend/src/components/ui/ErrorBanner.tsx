import { CountdownText } from './CountdownText';

export interface ErrorBannerProps {
  variant?: 'error' | 'warning';
  message: string;
  countdownSeconds?: number;
  className?: string;
}

const VARIANT_CLASS: Record<NonNullable<ErrorBannerProps['variant']>, string> = {
  error: 'border-neon-danger/40 bg-neon-danger/10 text-neon-danger',
  warning: 'border-neon-warning/40 bg-neon-warning/10 text-neon-warning',
};

export function ErrorBanner({
  variant = 'error',
  message,
  countdownSeconds,
  className = '',
}: ErrorBannerProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`mb-4 flex flex-col gap-1 rounded-xl border px-4 py-3 text-sm ${VARIANT_CLASS[variant]} ${className}`}
    >
      <span className="flex items-center gap-2">
        <span aria-hidden="true">⚠</span>
        {message}
      </span>
      {typeof countdownSeconds === 'number' ? (
        <CountdownText secondsRemaining={countdownSeconds} className="text-slate-300" />
      ) : null}
    </div>
  );
}
