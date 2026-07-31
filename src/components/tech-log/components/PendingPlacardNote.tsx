import { AlertTriangle } from 'lucide-react';
import { pendingPlacardStep } from '../engine/pendingPlacardStep';
import type { Deferral } from '../types';
import { cn } from '../../ui/utils';

/**
 * LG-170 — the line that replaces staring at the word `PENDING_PLACARD`.
 *
 * Renders nothing unless the deferral is actually pending, so callers can drop it in beside the
 * status badge unconditionally. Deliberately styled in the error tone rather than a neutral hint:
 * the aircraft is grounded in this state, and a friendlier instruction must not read as reassurance.
 */
export function PendingPlacardNote({ deferral, className }: { deferral: Deferral; className?: string }) {
  const step = pendingPlacardStep(deferral);
  if (!step) return null;

  return (
    <div
      className={cn(
        'mt-1.5 flex items-start gap-1.5 border-l-2 border-l-[var(--gfo-error,#EF3340)] py-0.5 pl-2 text-xs',
        className,
      )}
    >
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--gfo-error,#EF3340)]" aria-hidden />
      <span>
        <span className="font-medium text-[var(--gfo-error,#EF3340)]">Still grounded.</span>{' '}
        <span className="text-muted-foreground">
          Next: {step.action}
          {step.where ? ` — ${step.where}` : ''}.
        </span>
      </span>
    </div>
  );
}
