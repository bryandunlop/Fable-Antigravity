import type { QueueItem } from '../dayOfQueue';
import { formatCountdown } from '../dayOfQueue';
import type { TimelineEntry } from '../dayTimeline';
import { DayTimeline } from './DayTimeline';
import type { CustodyState } from '../../tech-log/engine/custody';
import type { Serviceability } from '../../tech-log/types';

const zulu = (iso: string) => `${iso.slice(11, 16)}Z`;

// Serviceability keeps the brand RAG tokens — never Tailwind's own greens (LG-158/D33).
const SV_DOT: Record<Serviceability, string> = {
  GREEN: 'bg-[var(--gfo-success)]',
  AMBER: 'bg-[var(--gfo-warning)]',
  RED: 'bg-[var(--gfo-error)]',
  // Neutral on purpose — a tail with no assessed dispatch state must not be painted as if it had one.
  NOT_ASSESSED: 'bg-muted-foreground',
};

/**
 * The day-of pane (D84 slice 3), replacing the four-module board inside T-4h.
 *
 * Three things, in the order they matter: WHEN you go, WHETHER the aircraft is yours, and WHAT is
 * still owed — that last one ranked by its own clock rather than by which module owns it. The board
 * this replaces gave FRAT, fuel, handover and scheduling four equal boxes and left the pilot to work
 * out which mattered next.
 */
export function DayOfPane({
  nowUtc, nextDepartureUtc, route, legSequence, legCount, paxCount, progress, timeline,
  serviceability, custody, deferralCount, onOpenHandover, onOpenItem,
}: {
  nowUtc: string;
  nextDepartureUtc?: string;
  route?: { from: string; to: string };
  legSequence?: number;
  legCount: number;
  paxCount?: number;
  progress: { done: number; total: number };
  /** The day in clock order (`dayTimeline`), which carries the outstanding queue inside it. */
  timeline: TimelineEntry[];
  serviceability: Serviceability;
  custody?: CustodyState;
  deferralCount: number;
  onOpenHandover: () => void;
  onOpenItem: (item: QueueItem) => void;
}) {
  const countdown = formatCountdown(nowUtc, nextDepartureUtc);
  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  const grounded = serviceability === 'RED';
  // RED GROUNDING BEATS CUSTODY. This is the same precedence `moduleStatus.handoverModule` already
  // encodes and CLAUDE.md states outright: a grounded aircraft is a hard stop regardless of who
  // holds it. Written as `&& !grounded` rather than as ternary ORDER because order is exactly what
  // went wrong — the heading said "Aircraft grounded" while the button beside it said "Review &
  // sign", inviting a PIC signature on an aircraft that may not be dispatched.
  const offered = custody === 'OFFERED' && !grounded;

  return (
    <div className="space-y-3">
      {/* Countdown band — Midnight, because this is the one thing on the screen that is a state of
          the world rather than a task. */}
      <section className="rounded-lg bg-[var(--gfo-midnight)] px-5 py-4 text-white">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--gfo-daylight)]">
              {nextDepartureUtc ? 'Next departure' : 'No departure ahead'}
            </span>
            <div className="mt-1 text-2xl font-semibold leading-tight tracking-tight">
              {route ? `${route.from} → ${route.to}` : '—'}
            </div>
            <div className="mt-0.5 text-xs text-white/70">
              {nextDepartureUtc ? `ETD ${zulu(nextDepartureUtc)}` : 'Every leg has departed'}
              {legSequence != null ? ` · leg ${legSequence} of ${legCount}` : ''}
              {paxCount != null ? ` · ${paxCount} pax` : ''}
            </div>
          </div>

          {countdown && (
            <span className="gfo-numeric shrink-0 text-[52px] leading-none">{countdown}</span>
          )}

          {progress.total > 0 && (
            <div className="w-[180px] shrink-0">
              <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <span className="text-xs text-white/70">Before push</span>
                <span className="text-sm font-semibold">{progress.done} of {progress.total}</span>
              </div>
              <div className="h-1 overflow-hidden rounded-sm bg-white/20">
                <i className="block h-full rounded-sm bg-[var(--gfo-daylight)]" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}
        </div>

        <div className="mt-3.5 border-t border-white/[0.18] pt-2.5 text-xs">
          <span className="inline-flex items-center gap-2">
            <span className={`h-2 w-2 shrink-0 rounded-full ${SV_DOT[serviceability]}`} aria-hidden />
            {/* NOT_ASSESSED must never fall through to "Serviceable" (LG-143): a tail whose D195 MEL
                is unapproved has no dispatch state, and saying it is serviceable is a claim myGFO
                is not entitled to make. */}
            {grounded
              ? 'Unserviceable — grounded'
              : serviceability === 'NOT_ASSESSED'
                ? 'No dispatch state assessed — D195 MEL not yet approved'
                : deferralCount > 0
                  ? `Serviceable · ${deferralCount} deferral${deferralCount === 1 ? '' : 's'}`
                  : 'Serviceable · no deferrals'}
          </span>
        </div>
      </section>

      {/* The one decision that outranks the queue: is this aircraft yours to fly? */}
      {(grounded || custody) && (
        <section className={`rounded-lg border bg-card p-4 ${
          grounded ? 'border-[var(--gfo-error)] shadow-[inset_4px_0_0_var(--gfo-error)]'
          : offered ? 'border-[var(--gfo-custody-crew)] shadow-[inset_4px_0_0_var(--gfo-custody-crew)]'
          : 'border-border'}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-base font-semibold leading-tight">
                {grounded ? 'Aircraft grounded' : offered ? 'Accept the aircraft' : custody === 'WITH_CREW' ? 'Aircraft accepted' : 'With maintenance'}
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {grounded
                  ? 'An open airworthiness defect is neither rectified nor covered by an active deferral.'
                  : offered
                    ? `Released to you${deferralCount > 0 ? ` — ${deferralCount} deferral${deferralCount === 1 ? '' : 's'} to acknowledge` : ''} before you sign as PIC.`
                    : custody === 'WITH_CREW'
                      ? 'In your custody. The signed briefing stays available.'
                      : 'Maintenance holds the aircraft — nothing to accept yet.'}
              </p>
            </div>
            {custody !== 'IN_MAINTENANCE' && (
              <button onClick={onOpenHandover}
                className={`min-h-[44px] shrink-0 rounded px-4 py-2 text-sm font-medium duration-fast ${
                  offered ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'border border-border hover:bg-accent'}`}>
                {grounded ? 'Open handover' : offered ? 'Review & sign' : 'View briefing'}
              </button>
            )}
          </div>
        </section>
      )}

      {/* The day in clock order. This was a flat "by the clock" list of outstanding items, which is
          the right instrument right up to the moment the PIC signs — and the wrong one immediately
          after, when the list empties and a pilot with three legs still to fly is left looking at
          "Nothing outstanding". The items did not go away; they moved onto the legs they belong to.
          (Bryan, 2026-08-21) */}
      <DayTimeline nowUtc={nowUtc} entries={timeline} onOpenItem={onOpenItem} />
    </div>
  );
}
