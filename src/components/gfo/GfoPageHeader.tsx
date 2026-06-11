import type { ReactNode } from 'react';
import { cn } from '../ui/utils';

interface GfoPageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function GfoPageHeader({ eyebrow, title, description, actions, className }: GfoPageHeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        {eyebrow && <div className="gfo-eyebrow mb-1">{eyebrow}</div>}
        <h1 className="text-2xl font-semibold leading-tight text-primary">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
