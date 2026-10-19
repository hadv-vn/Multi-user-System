import { FieldErrorText } from './FieldErrorText';

export interface CheckboxProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
}

export function Checkbox({ id, label, checked, onChange, error }: CheckboxProps) {
  const errorId = `${id}-error`;

  return (
    <div>
      <div className="flex items-start gap-2.5">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="mt-0.5 h-4 w-4 rounded border-white/20 bg-transparent text-neon-cyan focus:ring-neon-cyan"
        />
        <label htmlFor={id} className="text-sm text-slate-300">
          {label}
        </label>
      </div>
      {error ? <FieldErrorText id={errorId} message={error} /> : null}
    </div>
  );
}
