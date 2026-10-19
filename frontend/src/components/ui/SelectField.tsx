import { FieldErrorText } from './FieldErrorText';

export interface SelectFieldOption<T extends string> {
  value: T;
  label: string;
}

export interface SelectFieldProps<T extends string> {
  id: string;
  label: string;
  value: T;
  options: SelectFieldOption<T>[];
  onChange: (value: T) => void;
  error?: string;
}

export function SelectField<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
  error,
}: SelectFieldProps<T>) {
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-300">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`w-full rounded-xl border bg-slate-950 px-3.5 py-2.5 text-slate-100 outline-none transition-colors duration-180 ease-out ${
          error
            ? 'border-neon-danger'
            : 'border-white/15 focus:border-neon-cyan focus:shadow-[0_0_8px_rgba(34,211,238,0.25)]'
        }`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <FieldErrorText id={errorId} message={error} /> : null}
    </div>
  );
}
