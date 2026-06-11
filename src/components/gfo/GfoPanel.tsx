import { useId } from 'react';
import type { ReactNode } from 'react';
import { cn } from '../ui/utils';

interface GfoPanelProps {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function GfoPanel({ title, action, children, className }: GfoPanelProps) {
  const titleId = useId();
  return (
    <section
      aria-labelledby={title ? titleId : undefined}
      className={cn('rounded border border-border bg-card p-5 shadow-sm', className)}
    >
      {(title || action) && (
        <div className={cn('mb-4 flex items-end gap-3', title ? 'justify-between' : 'justify-end')}>
          {title && (
            <h2 id={titleId} className="text-lg font-semibold leading-tight text-primary">
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
