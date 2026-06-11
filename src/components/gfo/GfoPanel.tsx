import type { ReactNode } from 'react';
import { cn } from '../ui/utils';

interface GfoPanelProps {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function GfoPanel({ title, action, children, className }: GfoPanelProps) {
  return (
    <section className={cn('rounded border border-border bg-card p-5 shadow-sm', className)}>
      {(title || action) && (
        <div className="mb-4 flex items-end justify-between gap-3">
          {title && <h2 className="text-lg font-semibold leading-tight text-primary">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
