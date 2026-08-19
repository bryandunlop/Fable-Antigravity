import { Shield, MapPin, Fuel, Lock, Check } from 'lucide-react';
import type { QueueItem } from '../dayOfQueue';
import { formatCountdown } from '../dayOfQueue';
import type { CustodyState } from '../../tech-log/engine/custody';

const zulu = (iso: string) => `${iso.slice(11, 16)}Z`;

const KIND_ICON = { frat: Shield, airport: MapPin, fuel: Fuel } as const;

// Serviceability keeps the brand RAG tokens — never Tailwind's own greens (LG-158/D33).
const SV_DOT: Record<string, string> = {
  GREEN: 'bg-[var(--gfo-success)]',
  AMBER: 'bg-[var(--gfo-warning)]',
  RED: 'bg-[var(--gfo-error)]',
};

function queueLabel(i: QueueItem): { title: string; sub: string; action: string } {
  switch (i.kind) {
    case 'frat':
      return { title: `FRAT — leg ${i.legSequence}`, sub: i.state === 'draft' ? 'Draft saved, not submitted' : 'Not started',
        action: i.state === 'draft' ? 'Resume' : 'Start' };
    case 'airport':
      return { title: `Airport review — ${i.departureIcao}, ${i.arrivalIcao}`, sub: 'Not reviewed', action: 'Open' };
    case 'fuel':
      return i.state === 'locked'
        ? { title: `Fuel — ${i.departureIcao} farm`, sub: `Request closed ${zulu(i.dueUtc)} — not submitted`, action: '' }
        : { title: `Fuel — ${i.departureIcao} farm`, sub: `Locks ${zulu(i.dueUtc)}`, action: 'Submit' };
  }
}

/**
 * The day-of pane (D84 slice 3), replacing the four-module board inside T-4h.
 *
 * Three things, in the order they matter: WHEN you go, WHETHER the aircraft is yours, and WHAT is
 * still owed — that last one ranked by its own clock rather than by which module owns it. The board
 * this replaces gave FRAT, fuel, handover and scheduling four equal boxes and left the pilot to work
 * out which mattered next.
 */
export function DayOfPane({
  nowUtc, nextDepartureUtc, route, legSequence, legCount, paxCount, progress, queue,
  serviceability, custody, deferralCount, onOpenHandover, onOpenItem,
}: {
  nowUtc: string;
  nextDepartureUtc?: string;
  route?: { from: string; to: string };
  legSequence?: number;
  legCount: number;
  paxCount?: number;
  progress: { done: number; total: number };
  queue: QueueItem[];
  serviceability: 'GREEN' | 'AMBER' | 'RED';
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
            {grounded
              ? 'Unserviceable — grounded'
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

      {/* Everything still owed, by its own clock. */}
      <section className="rounded-lg border border-border bg-card">
        <div className="flex items-baseline justify-between gap-2 border-b border-border px-4 py-2.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">By the clock</span>
          <span className="text-xs text-muted-foreground">{queue.length} open</span>
        </div>
        {queue.length === 0 ? (
          <p className="flex items-center gap-2 px-4 py-4 text-sm text-[var(--gfo-success-ink)]">
            <Check className="h-4 w-4" aria-hidden /> Nothing outstanding for the legs ahead.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {queue.map((i) => {
              const Icon = KIND_ICON[i.kind];
              const { title, sub, action } = queueLabel(i);
              const late = i.state === 'locked';
              return (
                <li key={i.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className={`w-[78px] shrink-0 text-right text-sm font-semibold tabular-nums ${
                    late ? 'text-[var(--gfo-error-ink)]' : 'text-foreground'}`}>
                    {formatCountdown(nowUtc, i.dueUtc)}
                  </span>
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium leading-tight">{title}</span>
                    <span className="block text-xs text-muted-foreground">{sub}</span>
                  </span>
                  {action
                    ? <button onClick={() => onOpenItem(i)}
                        className="min-h-[38px] shrink-0 rounded-full border border-border px-3.5 py-1.5 text-xs font-medium duration-fast hover:bg-accent">
                        {action}
                      </button>
                    : <span className="inline-flex shrink-0 items-center gap-1.5 px-2 text-xs text-muted-foreground">
                        <Lock className="h-3.5 w-3.5" aria-hidden /> Locked
                      </span>}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
