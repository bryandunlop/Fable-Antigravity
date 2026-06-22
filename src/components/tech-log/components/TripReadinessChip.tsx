import type { TripReadiness } from '../engine/readiness';
import { cn } from '../../ui/utils';

const MAP: Record<TripReadiness, { label: string; dot: string; text: string }> = {
  READY:     { label: 'Ready',        dot: 'bg-[var(--gfo-success,#00B140)]', text: 'text-[var(--gfo-success,#00B140)]' },
  NOT_READY: { label: 'Almost ready', dot: 'bg-[var(--gfo-warning,#F1B434)]', text: 'text-[var(--gfo-warning,#F1B434)]' },
  RED:       { label: 'Not ready',    dot: 'bg-[var(--gfo-error,#EF3340)]',   text: 'text-[var(--gfo-error,#EF3340)]' },
};

// Quiet dot + word for a trip's derived readiness (never a loud filled pill).
export function TripReadinessChip({ state, label, className }: { state: TripReadiness; label?: string; className?: string }) {
  const m = MAP[state];
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm', m.text, className)}>
      <span className={cn('inline-block h-2 w-2 rounded-full', m.dot)} />
      {label ?? m.label}
    </span>
  );
}
