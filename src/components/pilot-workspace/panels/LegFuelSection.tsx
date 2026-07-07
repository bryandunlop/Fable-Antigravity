import { useState } from 'react';
import { toast } from 'sonner';
import { useTechLog, useCurrentUser } from '../../tech-log/TechLogContext';
import { submitFuelOnLeg } from '../../tech-log/preflightActions';
import { newId } from '../../tech-log/util/id';
import { requiresFuelFarmSubmission } from '../../tech-log/engine/fuel';
import type { Trip, TripLeg } from '../../tech-log/types';

/** Prep-tab fuel submission for one leg (home-base fuel-farm). Keeps the existing 4h-before-ETD lock. */
export function LegFuelSection({ tlTrip, leg }: { tlTrip: Trip; leg: TripLeg }) {
  const { state, dispatch } = useTechLog();
  const ac = state.aircraft.find((a) => a.id === tlTrip.aircraftId);
  const user = useCurrentUser();
  const [lbs, setLbs] = useState('');

  if (!ac || !requiresFuelFarmSubmission(leg, ac)) return null;

  if (leg.fuelRequestId) {
    return (
      <div className="rounded-lg border p-3 text-sm">
        <span className="font-medium">Fuel</span> <span className="text-emerald-700">· submitted to {leg.departureIcao} fuel farm</span>
      </div>
    );
  }
  return (
    <div className="rounded-lg border p-3">
      <div className="text-sm font-medium mb-1">Fuel request <span className="text-xs text-muted-foreground">{leg.departureIcao} fuel farm</span></div>
      <div className="flex items-center gap-2">
        <input value={lbs} onChange={(e) => setLbs(e.target.value)} placeholder="lb"
          className="w-24 text-sm rounded border px-2 py-2 min-h-[44px]" />
        <button className="text-sm rounded border px-3 py-2 min-h-[44px] hover:bg-accent"
          onClick={() => {
            const res = submitFuelOnLeg({ dispatch, newId, trip: tlTrip, leg, actorOid: user.oid, lbs: Number(lbs), nowMs: Date.now() });
            if (!res.ok) toast.error(res.error); else toast.success(`Fuel submitted to ${leg.departureIcao} fuel farm`);
          }}>Submit fuel</button>
      </div>
      <p className="text-xs text-muted-foreground mt-1">Locks 4 hours before departure.</p>
    </div>
  );
}
