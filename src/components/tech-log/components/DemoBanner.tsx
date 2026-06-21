import { FlaskConical } from 'lucide-react';

export function DemoBanner() {
  return (
    <div className="mb-4 flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
      <FlaskConical className="h-4 w-4 shrink-0" />
      <span>
        <strong>DEMO</strong> — mock data, not live airworthiness information. Do not use for dispatch decisions.
      </span>
    </div>
  );
}
