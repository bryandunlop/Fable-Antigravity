import { useState } from 'react';
import { toast } from 'sonner';
import { useTechLog, useCurrentUser } from '../../tech-log/TechLogContext';
import { submitFuelOnLeg } from '../../tech-log/preflightActions';
import { newId } from '../../tech-log/util/id';
import { requiresFuelFarmSubmission } from '../../tech-log/engine/fuel';
import type { Trip, TripLeg } from '../../tech-log/types';

/** Fuel module body (board): home-base fuel-farm submission for the selected leg. Bare content —
 *  the ModuleCard supplies the "Fuel" header + status pill. Keeps the 4h-before-ETD lock. */
export function LegFuelSection({ tlTrip, leg }: { tlTrip: Trip; leg: TripLeg }) {
  const { state, dispatch } = useTechLog();
  const ac = state.aircraft.find((a) => a.id === tlTrip.aircraftId);
  const user = useCurrentUser();
  const [lbs, setLbs] = useState('');

  if (!ac || !requiresFuelFarmSubmission(leg, ac)) {
    return <p className="text-sm text-muted-foreground">No home-base fuel-farm uplift for this leg.</p>;
  }
  if (leg.fuelRequestId) {
    return <p className="text-sm text-emerald-700">Submitted to {leg.departureIcao} fuel farm.</p>;
  }
  return (
    <div>
      <div className="mb-2 text-xs text-muted-foreground">{leg.departureIcao} fuel farm</div>
      <div className="flex items-center gap-2">
        <input value={lbs} onChange={(e) => setLbs(e.target.value)} placeholder="lb"
          className="w-24 min-h-[44px] rounded border px-2 py-2 text-sm" />
        <button className="min-h-[44px] rounded border px-3 py-2 text-sm hover:bg-accent"
          onClick={() => {
            const res = submitFuelOnLeg({ dispatch, newId, trip: tlTrip, leg, actorOid: user.oid, lbs: Number(lbs), nowMs: Date.now() });
            if (!res.ok) toast.error(res.error); else toast.success(`Fuel submitted to ${leg.departureIcao} fuel farm`);
          }}>Submit fuel</button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Locks 4 hours before departure.</p>
    </div>
  );
}
