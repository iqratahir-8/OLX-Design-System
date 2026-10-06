import type { ButtonHTMLAttributes } from 'react';

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  pressed?: boolean;
}

export function Chip({ pressed = false, className, ...rest }: ChipProps) {
  return (
    <button type="button" className={['olx-chip', className].filter(Boolean).join(' ')} aria-pressed={pressed} {...rest} />
  );
}
