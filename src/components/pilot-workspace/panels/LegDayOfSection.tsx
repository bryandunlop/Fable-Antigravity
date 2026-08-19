import { Check, ChevronRight } from 'lucide-react';
import { useTechLog, useCurrentUser } from '../../tech-log/TechLogContext';
import { markAirportReviewedOnLeg } from '../../tech-log/preflightActions';
import { newId } from '../../tech-log/util/id';
import { LegFratSection } from './LegFratSection';
import type { Trip, TripLeg } from '../../tech-log/types';

/** FRAT & airport module body (day-of board): the FRAT panel plus airport review, for the selected
 *  leg. Bare — the ModuleCard supplies the header. The FRAT half lives in LegFratSection so the
 *  prep matrix can open the same panel per leg (D84). */
export function LegDayOfSection({ tlTrip, leg, tripNumber, onOpenAirport }: { tlTrip: Trip; leg: TripLeg; tripNumber: string; onOpenAirport: () => void }) {
  const { dispatch } = useTechLog();
  const user = useCurrentUser();

  return (
    <div className="space-y-3 text-sm">
      <LegFratSection tlTrip={tlTrip} leg={leg} tripNumber={tripNumber} />

      {/* Airport review */}
      <div className="border-t pt-3">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium">Airport review
            {leg.airportReviewed
              ? <span className="ml-2 text-xs text-emerald-700"><Check className="inline h-3.5 w-3.5" /> reviewed</span>
              : <span className="ml-2 text-xs text-muted-foreground">not reviewed</span>}
          </span>
          <button type="button" onClick={onOpenAirport}
            className="inline-flex items-center gap-0.5 text-xs text-primary hover:underline">
            View airport details <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        {!leg.airportReviewed && (
          <button className="mt-2 min-h-[44px] rounded border px-3 py-2 text-sm hover:bg-accent"
            onClick={() => markAirportReviewedOnLeg({ dispatch, newId, trip: tlTrip, leg, actorOid: user.oid })}>
            Mark airport reviewed
          </button>
        )}
      </div>
    </div>
  );
}
