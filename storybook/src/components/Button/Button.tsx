import type { ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger';
  size?: 'default' | 'sm';
  block?: boolean;
}

export function Button({ variant = 'primary', size = 'default', block, className, ...rest }: ButtonProps) {
  const cls = ['olx-btn', `olx-btn--${variant}`, size === 'sm' && 'olx-btn--sm', block && 'olx-btn--block', className]
    .filter(Boolean)
    .join(' ');
  return <button type="button" className={cls} {...rest} />;
}
