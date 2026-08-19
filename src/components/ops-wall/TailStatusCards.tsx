import React from 'react';
import { Link } from 'react-router-dom';
import { Plane } from 'lucide-react';
import type { UnifiedFleetAircraft } from '../hooks/useUnifiedFleetStatus';
import { RAG_DOT } from './ragColors';
import { formatUntilEt } from '../../services/etClock';
import type { TodayLeg } from '../../services/todaysOpsMock';

/**
 * The landing page's per-tail status rail — D88 (adopted from the canvas's Option B).
 *
 * One card per tail: RAG state, where it is, and one line of "why" (driving defect for
 * RED, governing MEL clock for AMBER) from the derived ops-detail projection. Cards from
 * `sm` up; below that the rail collapses to a compact status list (44px+ rows) so the
 * same information order survives on a phone.
 */

const STATUS_WORD: Record<string, string> = {
  GREEN: 'DISPATCHABLE',
  AMBER: 'DEFERRED · MEL',
  RED: 'GROUNDED',
};

/** Text colours per RAG state — amber darkened for contrast on the white card. */
const STATUS_TEXT: Record<string, string> = {
  GREEN: RAG_DOT.GREEN,
  AMBER: '#B98A2F',
  RED: RAG_DOT.RED,
};

function shortType(type: string): string {
  return type.replace('Gulfstream ', '');
}

function whereLine(ac: UnifiedFleetAircraft): string {
  if (ac.flightStatus === 'in-flight') {
    return ac.location?.replace('En Route ', 'In flight · ') ?? 'In flight';
  }
  return ac.location ?? '—';
}

function CardFooter({ ac }: { ac: UnifiedFleetAircraft }) {
  const { status, headline, deferralClock } = ac.airworthiness;

  if (status === 'RED') {
    return (
      <p className="border-t border-border pt-1.5 text-[10px] font-medium text-[#EF3340]">
        {headline ?? 'Open airworthiness defect'} &middot; awaiting mx release
      </p>
    );
  }

  if (status === 'AMBER' && deferralClock) {
    const { daysRemaining, intervalDays } = deferralClock;
    const pct =
      daysRemaining !== null && intervalDays
        ? Math.max(0, Math.min(100, Math.round(((intervalDays - daysRemaining) / intervalDays) * 100)))
        : 0;
    return (
      <div className="border-t border-border pt-1.5">
        <p className="truncate text-[10px] text-muted-foreground">{headline ?? 'MEL deferral'}</p>
        <div className="mt-1 flex items-center gap-1.5">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-[#F1B434]" style={{ width: `${pct}%` }} />
          </div>
          <span className="shrink-0 text-[10px] font-semibold text-[#B98A2F]">
            {daysRemaining !== null && intervalDays
              ? `${daysRemaining} of ${intervalDays}d left`
              : deferralClock.category
                ? `Cat ${deferralClock.category}`
                : 'No date clock'}
          </span>
        </div>
      </div>
    );
  }

  return <p className="border-t border-border pt-1.5 text-[10px] text-muted-foreground/70">No open defects</p>;
}

export default function TailStatusCards({
  fleet,
  legs = [],
  now = new Date(),
}: {
  fleet: UnifiedFleetAircraft[];
  /** Today's legs, so a card can show what this tail does next. */
  legs?: TodayLeg[];
  now?: Date;
}) {
  /** The next leg still ahead for a tail, by scheduled departure. */
  const nextLegFor = (tail: string): TodayLeg | undefined =>
    legs
      .filter(l => l.tail === tail && l.status === 'Scheduled')
      .sort((a, b) => a.schedDep.localeCompare(b.schedDep))[0];

  return (
    <>
      {/* Cards — sm and up */}
      <div className="hidden gap-3 sm:grid sm:grid-cols-3 xl:grid-cols-5">
        {fleet.map(ac => (
          <Link
            key={ac.tailNumber}
            to="/aircraft"
            className="flex flex-col gap-1.5 rounded-lg border border-border bg-card p-3 transition-colors hover:border-accent"
            style={{ borderTopWidth: 3, borderTopColor: RAG_DOT[ac.airworthiness.status] }}
          >
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[15px] font-bold">{ac.tailNumber}</span>
              <span className="text-[10px] text-muted-foreground">{shortType(ac.model)}</span>
            </div>
            <span
              className="text-[11px] font-semibold tracking-wide"
              style={{ color: STATUS_TEXT[ac.airworthiness.status] }}
            >
              {STATUS_WORD[ac.airworthiness.status] ?? ac.airworthiness.status}
            </span>
            <p className="flex items-center gap-1 text-[11px] leading-relaxed text-muted-foreground">
              {ac.flightStatus === 'in-flight' && <Plane className="h-3 w-3 shrink-0 text-primary" aria-hidden />}
              <span className="truncate">{whereLine(ac)}</span>
            </p>
            {(() => {
              const next = nextLegFor(ac.tailNumber);
              if (!next) return null;
              const countdown = formatUntilEt(next.schedDep, now);
              return (
                <p className="truncate text-[11px] text-muted-foreground">
                  Next: {next.depIata}&ndash;{next.arrIata} {next.schedDep} ET
                  {countdown && <span className="text-foreground/70"> &middot; {countdown}</span>}
                </p>
              );
            })()}
            <CardFooter ac={ac} />
          </Link>
        ))}
      </div>

      {/* Compact status list — below sm (phone) */}
      <div className="overflow-hidden rounded-lg border border-border bg-card sm:hidden">
        {fleet.map((ac, i) => (
          <Link
            key={ac.tailNumber}
            to="/aircraft"
            className={`flex min-h-[44px] items-center gap-2.5 px-3 py-2.5 ${i > 0 ? 'border-t border-border' : ''}`}
            style={{ borderLeftWidth: 3, borderLeftColor: RAG_DOT[ac.airworthiness.status] }}
          >
            <span className="font-mono text-sm font-bold">{ac.tailNumber}</span>
            <span className="truncate text-xs text-muted-foreground">
              {ac.airworthiness.status === 'RED'
                ? (ac.airworthiness.headline ?? 'Grounded')
                : ac.airworthiness.status === 'AMBER' && ac.airworthiness.deferralClock
                  ? `MEL ${ac.airworthiness.deferralClock.category ?? ''} · ${
                      ac.airworthiness.deferralClock.daysRemaining !== null && ac.airworthiness.deferralClock.intervalDays
                        ? `${ac.airworthiness.deferralClock.daysRemaining} of ${ac.airworthiness.deferralClock.intervalDays}d left`
                        : 'no date clock'
                    }`
                  : whereLine(ac)}
            </span>
            <span
              className="ml-auto shrink-0 text-[10px] font-semibold"
              style={{ color: STATUS_TEXT[ac.airworthiness.status] }}
            >
              {ac.airworthiness.status === 'GREEN' ? 'DISP' : ac.airworthiness.status === 'RED' ? 'GND' : 'MEL'}
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
