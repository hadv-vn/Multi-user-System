export interface CountdownTextProps {
  secondsRemaining: number;
  /** Placeholder `{seconds}` được thay bằng secondsRemaining. */
  template?: string;
  className?: string;
}

const DEFAULT_TEMPLATE = 'Vui lòng thử lại sau {seconds} giây.';

export function CountdownText({
  secondsRemaining,
  template = DEFAULT_TEMPLATE,
  className = '',
}: CountdownTextProps) {
  return (
    <p aria-live="polite" className={`font-mono text-sm ${className}`}>
      {template.replace('{seconds}', String(secondsRemaining))}
    </p>
  );
}
