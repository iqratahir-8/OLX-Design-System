import type { InputHTMLAttributes } from 'react';
import { useId } from 'react';

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export function Field({ label, hint, error, id, ...rest }: FieldProps) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <div className={['olx-field', error && 'olx-field--error'].filter(Boolean).join(' ')}>
      <label className="olx-label" htmlFor={inputId}>
        {label}
      </label>
      <input className="olx-input" id={inputId} aria-invalid={Boolean(error)} {...rest} />
      {(error || hint) && <span className="olx-hint">{error ?? hint}</span>}
    </div>
  );
}
