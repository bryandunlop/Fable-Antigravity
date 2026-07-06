import type { ReactNode } from 'react';
import { cn } from '../ui/utils';

interface GfoEmptyStateProps {
  /** Declarative sentence ending in a period, e.g. "No open squawks." */
  message: string;
  icon?: ReactNode;
  action?: ReactNode;
  circle?: 'daylight' | 'sunrise';
  className?: string;
}

export function GfoEmptyState({ message, icon, action, circle = 'daylight', className }: GfoEmptyStateProps) {
  return (
    <div className={cn('relative overflow-hidden rounded-lg border border-border bg-card px-6 py-10 text-center', className)}>
      <div
        aria-hidden="true"
        className={cn(
          'absolute -right-12 -bottom-16 h-40 w-40 rounded-full',
          circle === 'daylight' ? 'bg-gfo-daylight' : 'bg-gfo-sunrise',
        )}
      />
      <div className="relative z-10 flex flex-col items-center gap-3">
        {icon && <div className="text-muted-foreground [&_svg]:h-8 [&_svg]:w-8">{icon}</div>}
        <p className="text-sm text-muted-foreground">{message}</p>
        {action}
      </div>
    </div>
  );
}
