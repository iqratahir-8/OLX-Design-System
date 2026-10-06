import type { HTMLAttributes } from 'react';

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
}

export function Alert({ variant = 'info', title, children, className, ...rest }: AlertProps) {
  return (
    <div role="status" className={['olx-alert', `olx-alert--${variant}`, className].filter(Boolean).join(' ')} {...rest}>
      <div>
        {title && <strong>{title}</strong>}
        {children}
      </div>
    </div>
  );
}
