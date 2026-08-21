import { Check, Lock, Shield, MapPin, Fuel } from 'lucide-react';
import type { PrepRow, PrepCell } from '../prepMatrix';

const zulu = (iso: string) => `${iso.slice(11, 16)}Z`;
const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' });

const CELL = 'flex min-h-[62px] flex-col justify-center gap-1 border-l border-border px-3 py-2';

function Done({ children }: { children?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-[var(--gfo-success-ink)]">
      <Check className="h-3.5 w-3.5" aria-hidden /> {children ?? 'Done'}
    </span>
  );
}

function Action({ label, onClick, strong = false }: { label: string; onClick: () => void; strong?: boolean }) {
  return (
    <button type="button" onClick={onClick}
      className={`inline-flex min-h-[38px] items-center self-start rounded border px-3 py-1.5 text-xs font-medium duration-fast hover:bg-accent ${
        strong ? 'border-primary text-primary' : 'border-border text-foreground'
      }`}>
      {label}
    </button>
  );
}

const Sub = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[11px] leading-tight text-muted-foreground">{children}</span>
);

function FuelCellBody({ cell, onOpen }: { cell: PrepCell; onOpen: () => void }) {
  if (cell.state === 'na') return <span className="text-xs text-muted-foreground/60">Not home base</span>;
  if (cell.state === 'done') return <Done>Requested</Done>;
  if (cell.state === 'locked') {
    // Deliberately not a button. The old fuel card offered Submit either way and surfaced the
    // refusal as a toast after the pilot had already typed a quantity.
    return (
      <>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5" aria-hidden /> Locked
        </span>
        {cell.lockAtUtc && <Sub>Closed {zulu(cell.lockAtUtc)}</Sub>}
      </>
    );
  }
  return (
    <>
      <Action label="Request uplift" onClick={onOpen} strong />
      {cell.lockAtUtc && <Sub>Locks {zulu(cell.lockAtUtc)}</Sub>}
    </>
  );
}

/**
 * The prep pane's instrument (D84): legs down, items across.
 *
 * Prep is worked BY ITEM ACROSS LEGS — one pass down fuel, one down FRAT, one down airports — which
 * is what the leg stepper cannot express: it makes you walk the trip four times, once per item.
 * Reading a column here is the pass.
 */
export function PrepMatrix({
  rows, scheduledLegCount = 0, onOpenFrat, onOpenAirport, onOpenFuel,
}: {
  rows: PrepRow[];
  /** Legs on the SCHEDULING record, which exist well before the trip is released to preflight.
   *  Empty rows with a non-zero count here means "not released yet", not "no legs". */
  scheduledLegCount?: number;
  onOpenFrat: (legId: string) => void;
  onOpenAirport: (legId: string) => void;
  onOpenFuel: (legId: string) => void;
}) {
  if (rows.length === 0) {
    // Two different situations, and conflating them was a small lie with a big read: a trip that
    // scheduling has fully planned showed "No legs on this trip yet", which looks like the itinerary
    // was lost rather than like prep has not opened.
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        {scheduledLegCount > 0 ? (
          <>Scheduling has {scheduledLegCount} {scheduledLegCount === 1 ? 'leg' : 'legs'} planned.
            {' '}Your preflight opens when the trip is released to the crew.</>
        ) : (
          <>No legs on this trip yet — nothing to prep until scheduling releases it.</>
        )}
      </div>
    );
  }

  const head = 'px-3 py-2 text-xs font-semibold tracking-wide';
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="grid grid-cols-[minmax(150px,1.4fr)_repeat(3,minmax(0,1fr))] bg-muted">
        <div className={head}>Leg</div>
        <div className={`${head} border-l border-border`}><Shield className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden />FRAT</div>
        <div className={`${head} border-l border-border`}><MapPin className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden />Airport review</div>
        <div className={`${head} border-l border-border`}><Fuel className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden />Fuel — home base</div>
      </div>

      {rows.map((r) => (
        <div key={r.leg.id} className="grid grid-cols-[minmax(150px,1.4fr)_repeat(3,minmax(0,1fr))] border-t border-border">
          <div className="flex min-h-[62px] flex-col justify-center gap-0.5 bg-background/40 px-3 py-2">
            <span className="text-sm font-semibold leading-tight">L{r.leg.sequence} · {r.leg.departureIcao} → {r.leg.arrivalIcao}</span>
            <Sub>{dayLabel(r.leg.departureTimeUtc)} · {zulu(r.leg.departureTimeUtc)}</Sub>
          </div>

          <div className={CELL}>
            {r.frat.state === 'done'
              ? <Done>Submitted{r.frat.score != null ? ` · ${r.frat.score}` : ''}</Done>
              : <>
                  <Action label={r.frat.state === 'draft' ? 'Resume draft' : 'Start'} onClick={() => onOpenFrat(r.leg.id)} strong={r.frat.state === 'draft'} />
                  {r.frat.state === 'draft' && <Sub>Saved, not submitted</Sub>}
                </>}
          </div>

          <div className={CELL}>
            {r.airport.state === 'done'
              ? <Done>Reviewed</Done>
              : <>
                  <Action label="Review" onClick={() => onOpenAirport(r.leg.id)} />
                  {r.airport.icaos && <Sub>{r.airport.icaos.join(' · ')}</Sub>}
                </>}
          </div>

          <div className={CELL}>
            <FuelCellBody cell={r.fuel} onOpen={() => onOpenFuel(r.leg.id)} />
          </div>
        </div>
      ))}
    </div>
  );
}
