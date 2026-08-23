import type { ReactNode } from 'react';
import type { Aircraft, Serviceability } from '../types';
import type { CustodyState } from '../engine/custody';
import { ServiceabilityChip } from './ServiceabilityChip';
import { CustodyChip } from './CustodyChip';
import { Badge } from '../../ui/badge';
import { cn } from '../../ui/utils';

/**
 * D71 — the tail-scoped header for the aircraft workspace.
 *
 * The page used to answer "which aircraft" in the shell header and "is it dispatchable, and why" in
 * a separate card two nav rows below it. Those are the same question asked twice, and the half that
 * matters was the half you had to scroll to. This band carries both, so the governing sentence is
 * the first thing on the page.
 *
 * The left rail is the RAG state and nothing else. Custody keeps its own chip on its own gold/blue
 * axis — the two must stay readable as separate axes, so custody never tints this band.
 */
const RAIL: Record<Serviceability, string> = {
  GREEN: 'var(--gfo-success,#00B140)',
  AMBER: 'var(--gfo-warning,#F1B434)',
  RED: 'var(--gfo-error,#EF3340)',
  // LG-143 — no rail colour for a tail with no dispatch answer to give.
  NOT_ASSESSED: 'var(--border)',
};

function Vital({ label, value, tone }: { label: string; value: string; tone?: 'error' }) {
  return (
    <div className="rounded-md bg-muted/50 px-3 py-2 text-right">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={cn('text-base font-medium', tone === 'error' && 'text-[var(--gfo-error-ink,#C81E2B)]')}>{value}</div>
    </div>
  );
}

export function AircraftBanner({
  aircraft,
  status,
  custody,
  governing,
  rule,
  blockerCount,
  asOf,
  note,
  actions,
}: {
  aircraft: Aircraft;
  /**
   * Taken straight from the projection — including `NOT_ASSESSED`, which the chip renders as
   * "Provisional". This used to be `Serviceability | null` with the page deciding when to pass
   * null; the type carries that now, so there is no per-caller decision left to get wrong.
   */
  status: Serviceability;
  custody: CustodyState;
  governing: string;
  rule: string;
  blockerCount: number;
  asOf: string;
  note?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div
      data-testid="aircraft-banner"
      className="mb-4 border border-l-[3px] bg-card p-4"
      style={{ borderLeftColor: RAIL[status] }}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight">{aircraft.tailNumber}</h1>
            <ServiceabilityChip status={status} />
            <CustodyChip state={custody} />
          </div>
          <p className="mt-1.5 text-sm">{governing}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{rule}</p>
          {note}
        </div>
        <div className="flex shrink-0 gap-2">
          <Vital label="Hours" value={aircraft.airframeTotalHours.toFixed(1)} />
          <Vital label="Cycles" value={String(aircraft.airframeTotalCycles)} />
          <Vital label="Blockers" value={String(blockerCount)} tone={blockerCount > 0 ? 'error' : undefined} />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {actions}
        <span className="ml-auto text-xs text-muted-foreground">
          {aircraft.type} · S/N {aircraft.serialNumber} · {aircraft.homeBase} · as of {asOf}
        </span>
      </div>
    </div>
  );
}
