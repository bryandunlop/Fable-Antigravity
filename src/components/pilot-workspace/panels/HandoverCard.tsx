import { useTechLog } from '../../tech-log/TechLogContext';
import { deriveServiceability } from '../../tech-log/engine/serviceability';
import { deriveCustody, type CustodyState } from '../../tech-log/engine/custody';
import type { Serviceability } from '../../tech-log/types';
import type { TripRecord } from '../../../scheduling/store/types';

// Typed to the union, not Record<string, …> (LG-143) — a loose key type is how a status this map
// has never heard of renders as no dot at all instead of failing to compile.
const SV_DOT: Record<Serviceability, string> = {
  GREEN: 'bg-emerald-500', AMBER: 'bg-amber-500', RED: 'bg-red-500',
  NOT_ASSESSED: 'bg-muted-foreground',
};

// Pilot-framed custody (first person) on the P&G-blue axis — distinct from the third-person CustodyChip.
const CUSTODY: Record<CustodyState, { dot: string; label: string; strong: boolean }> = {
  WITH_CREW: { dot: 'gfo-dot-crew', label: 'In your custody', strong: true },
  OFFERED: { dot: 'gfo-dot-maint-offered', label: 'Released to you', strong: true },
  IN_MAINTENANCE: { dot: 'gfo-dot-maint', label: 'With maintenance', strong: false },
};

/** Maintenance-handover module body (board): serviceability (RAG) + custody (P&G-blue axis) + open
 *  deferrals, with a CTA that opens the accept ceremony in-place (a slide-over within the pilot
 *  workspace) rather than ejecting to the tech-log shell. Bare — ModuleCard supplies the header. */
export function HandoverCard({ trip, onOpenHandover }: { trip: TripRecord; onOpenHandover: () => void }) {
  const { state } = useTechLog();
  const now = new Date().toISOString();
  // Handover is aircraft-keyed by tail — it shows the aircraft's real serviceability + custody even
  // before the trip is released to preflight (cold-open demo), matching the aircraft-keyed pill.
  const tlTrip = state.trips.find((t) => t.tripNumber === trip.tripNumber) ?? null;
  const ac = tlTrip
    ? state.aircraft.find((a) => a.id === tlTrip.aircraftId)
    : state.aircraft.find((a) => a.tailNumber === trip.tail);
  if (!ac) return <p className="text-sm text-muted-foreground">No aircraft on this tail — released to a placeholder.</p>;

  const sv = deriveServiceability(ac.id, state, now).status;
  const custody = deriveCustody(ac.id, state, now).state;
  const c = CUSTODY[custody];
  const deferrals = state.deferrals.filter((d) => d.aircraftId === ac.id && d.status === 'ACTIVE');
  /* LG-143 — this card told the PIC "Serviceable · no deferrals" under a green dot for the tail in
     onboarding, because the projection handed it GREEN. It now returns NOT_ASSESSED, so this reads
     the answer rather than re-deriving it from isProvisional. */
  const svText =
    sv === 'NOT_ASSESSED' ? 'In onboarding — D195 MEL pending FSDO approval'
    : sv === 'RED' ? 'Unserviceable — grounded'
    : sv === 'AMBER' ? `Serviceable · ${deferrals.length} deferral${deferrals.length === 1 ? '' : 's'}`
    : 'Serviceable · no deferrals';

  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${SV_DOT[sv]}`} aria-hidden />
        <span>{svText}</span>
      </div>
      <div className={`inline-flex items-center gap-1.5 ${c.strong ? 'font-medium text-[var(--gfo-custody-crew)]' : 'text-muted-foreground'}`}>
        <span className={`gfo-chip-dot ${c.dot}`} aria-hidden /> {c.label}
      </div>
      {tlTrip && (
        <div>
          <button
            type="button"
            onClick={onOpenHandover}
            className="inline-flex items-center min-h-[44px] rounded border px-3 py-2 text-xs hover:bg-accent"
          >
            {custody === 'WITH_CREW' ? 'View briefing' : custody === 'OFFERED' ? 'Review & accept' : 'Open handover'}
          </button>
        </div>
      )}
    </div>
  );
}
