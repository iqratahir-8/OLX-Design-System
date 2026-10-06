import type { HTMLAttributes } from 'react';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'featured' | 'accent' | 'info' | 'success' | 'danger';
}

export function Badge({ variant, className, ...rest }: BadgeProps) {
  const cls = ['olx-badge', variant && `olx-badge--${variant}`, className].filter(Boolean).join(' ');
  return <span className={cls} {...rest} />;
}
