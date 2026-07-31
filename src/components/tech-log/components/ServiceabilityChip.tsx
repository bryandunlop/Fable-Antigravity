import type { Serviceability } from '../types';
import { SERVICEABILITY_CLASS } from '../constants';
import { cn } from '../../ui/utils';

const LABEL: Record<Serviceability, string> = {
  GREEN: 'Serviceable',
  AMBER: 'MEL / restricted',
  RED: 'Grounded',
  /* LG-143 — the tail is in onboarding, so there is no dispatch answer to render. The chip says
     what IS true rather than borrowing a RAG word, and this is now the ONE place that decision
     lives: every surface that renders this chip inherits it instead of each remembering to check
     isProvisional (which is how four review passes each found new surfaces that had not). */
  NOT_ASSESSED: 'Provisional',
};

export function ServiceabilityChip({
  status,
  className,
  pulse = true,
}: {
  status: Serviceability;
  className?: string;
  pulse?: boolean;
}) {
  return (
    <span className={cn('status-badge inline-flex items-center gap-1.5', SERVICEABILITY_CLASS[status], className)}>
      <span className="relative flex h-2 w-2">
        {pulse && status === 'RED' && (
          <span className="absolute inline-flex h-full w-full rounded-full bg-current opacity-60 animate-ping" />
        )}
        <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
      </span>
      {LABEL[status]}
    </span>
  );
}
