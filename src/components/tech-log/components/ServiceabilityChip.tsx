import type { Serviceability } from '../types';
import { SERVICEABILITY_CLASS } from '../constants';
import { cn } from '../../ui/utils';

const LABEL: Record<Serviceability, string> = {
  GREEN: 'Serviceable',
  AMBER: 'MEL / restricted',
  RED: 'Grounded',
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
