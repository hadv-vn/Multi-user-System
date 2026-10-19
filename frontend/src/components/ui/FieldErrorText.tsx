export interface FieldErrorTextProps {
  id: string;
  message: string;
}

export function FieldErrorText({ id, message }: FieldErrorTextProps) {
  return (
    <p id={id} className="mt-1.5 flex items-center gap-1.5 text-sm text-neon-danger">
      <span aria-hidden="true">⚠</span>
      {message}
    </p>
  );
}
