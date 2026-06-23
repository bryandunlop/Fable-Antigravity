import { FlaskConical } from 'lucide-react';

export function DemoBanner({ variant = 'banner' }: { variant?: 'banner' | 'chip' }) {
  if (variant === 'chip') {
    return (
      <span
        className="hidden items-center gap-1.5 rounded-md border border-border bg-muted px-2 py-1 text-xs text-muted-foreground sm:inline-flex"
        title="Demo — mock data, not live airworthiness information"
      >
        Demo
      </span>
    );
  }

  return (
    <div className="mb-4 flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
      <FlaskConical className="h-4 w-4 shrink-0" />
      <span>
        <strong>DEMO</strong> — mock data, not live airworthiness information. Do not use for dispatch decisions.
      </span>
    </div>
  );
}
