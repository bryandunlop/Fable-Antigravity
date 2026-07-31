import { useTechLog } from '../../tech-log/TechLogContext';
import { deriveServiceability } from '../../tech-log/engine/serviceability';
import { deriveCustody, type CustodyState } from '../../tech-log/engine/custody';
import type { TripRecord } from '../../../scheduling/store/types';

/**
 * LG-158 — these were Tailwind defaults (emerald-500 / amber-500 / red-500), which put a
 * DIFFERENT green on the pilot's own board from every other serviceability surface in the
 * app. The brand tokens are P&G PMS 354 / 143 / 032 and are the same values behind
 * ServiceabilityChip's `status-*` classes. D33: brand tokens are imported, never copied —
 * and never approximated by whatever the utility framework ships.
 */
const SV_DOT: Record<string, string> = {
  GREEN: 'bg-[var(--gfo-success,#00B140)]',
  AMBER: 'bg-[var(--gfo-warning,#F1B434)]',
  RED: 'bg-[var(--gfo-error,#EF3340)]',
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
  const svText =
    sv === 'RED' ? 'Unserviceable — grounded'
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
