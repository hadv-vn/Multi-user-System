import type { InputHTMLAttributes, ReactNode } from 'react';

import { FieldErrorText } from './FieldErrorText';

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'onChange'> {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  trailingAddon?: ReactNode;
}

export function TextField({
  id,
  label,
  value,
  onChange,
  error,
  type = 'text',
  trailingAddon,
  className = '',
  ...rest
}: TextFieldProps) {
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-300">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`w-full rounded-xl border bg-transparent px-3.5 py-2.5 text-slate-100 outline-none transition-colors duration-180 ease-out placeholder:text-slate-500 ${
            trailingAddon ? 'pr-11' : ''
          } ${
            error
              ? 'border-neon-danger shadow-[0_0_8px_rgba(251,58,93,0.25)]'
              : 'border-white/15 focus:border-neon-cyan focus:shadow-[0_0_8px_rgba(34,211,238,0.25)]'
          } ${className}`}
          {...rest}
        />
        {trailingAddon ? (
          <div className="absolute inset-y-0 right-2 flex items-center">{trailingAddon}</div>
        ) : null}
      </div>
      {error ? <FieldErrorText id={errorId} message={error} /> : null}
    </div>
  );
}
