import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useTechLog, useCurrentUser } from '../../tech-log/TechLogContext';
import StandaloneFRATForm from '../../StandaloneFRATForm';
import { completeFratOnLeg, markAirportReviewedOnLeg, submitFuelOnLeg, saveFratDraftOnLeg } from '../../tech-log/preflightActions';
import { extractFratSelections } from '../../tech-log/util/fratDraft';
import { newId } from '../../tech-log/util/id';
import type { TripRecord } from '../../../scheduling/store/types';

export default function PreflightLegsPanel({ trip }: { trip: TripRecord; userRole: string }) {
  const { state, dispatch } = useTechLog();
  const user = useCurrentUser();
  const tlTrip = state.trips.find((t) => t.tripNumber === trip.tripNumber);
  const ac = tlTrip ? state.aircraft.find((a) => a.id === tlTrip.aircraftId) : undefined;
  const [fratOpenLegId, setFratOpenLegId] = useState<string | null>(null);
  const [fuel, setFuel] = useState<Record<string, string>>({});

  if (!tlTrip) {
    return (
      <section className="rounded-lg border p-4">
        <h2 className="font-semibold mb-2">Preflight</h2>
        <p className="text-sm text-muted-foreground">Not released to preflight yet.</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border p-4 space-y-3">
      <h2 className="font-semibold">Preflight <span className="text-xs text-muted-foreground">by leg</span></h2>
      {(tlTrip.legs ?? []).map((leg) => (
        <div key={leg.id} className="rounded border p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm">Leg {leg.sequence}: {leg.departureIcao} → {leg.arrivalIcao}</span>
            <Link to={`/tech-log/trips/${tlTrip.id}/legs/${leg.id}`} className="text-xs text-primary hover:underline">Leg detail ↗</Link>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded bg-muted px-2 py-1">FRAT: {leg.fratStatus}{leg.fratScore != null ? ` (${leg.fratScore})` : ''}</span>
            <span className="rounded bg-muted px-2 py-1">Airport: {leg.airportReviewed ? 'reviewed' : 'not reviewed'}</span>
            <span className="rounded bg-muted px-2 py-1">Fuel: {leg.fuelRequestId ? 'submitted' : 'not submitted'}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {leg.fratStatus !== 'COMPLETED' && (
              <button className="text-xs rounded border px-2 py-1 hover:bg-accent" onClick={() => setFratOpenLegId(fratOpenLegId === leg.id ? null : leg.id)}>
                {fratOpenLegId === leg.id ? 'Close FRAT' : leg.fratStatus === 'IN_PROGRESS' ? 'Resume FRAT (draft)' : 'Start FRAT'}
              </button>
            )}
            {!leg.airportReviewed && (
              <button className="text-xs rounded border px-2 py-1 hover:bg-accent"
                onClick={() => markAirportReviewedOnLeg({ dispatch, newId, trip: tlTrip, leg, actorOid: user.oid })}>
                Mark airport reviewed
              </button>
            )}
            {!leg.fuelRequestId && (
              <span className="flex items-center gap-1">
                <input value={fuel[leg.id] ?? ''} onChange={(e) => setFuel((f) => ({ ...f, [leg.id]: e.target.value }))}
                  placeholder="lb" className="w-20 text-xs rounded border px-2 py-1" />
                <button className="text-xs rounded border px-2 py-1 hover:bg-accent" onClick={() => {
                  const res = submitFuelOnLeg({ dispatch, newId, trip: tlTrip, leg, actorOid: user.oid, lbs: Number(fuel[leg.id]), nowMs: Date.now() });
                  if (!res.ok) toast.error(res.error); else toast.success(`Fuel submitted to ${leg.departureIcao} fuel farm`);
                }}>Submit fuel</button>
              </span>
            )}
          </div>
          {fratOpenLegId === leg.id && (
            <div className="border-t pt-2">
              <StandaloneFRATForm
                userRole={user.role}
                initialData={{ flightNumber: trip.tripNumber, aircraft: ac?.tailNumber, departure: leg.departureIcao,
                  destination: leg.arrivalIcao, date: leg.departureTimeUtc.slice(0, 10), time: leg.departureTimeUtc.slice(11, 16), pic: user.displayName,
                  selections: leg.fratDraft?.selections, mitigationNotes: leg.fratDraft?.mitigationNotes }}
                onClose={() => setFratOpenLegId(null)}
                onSave={(data: { status?: string; totalScore?: number; mitigationNotes?: string; items?: { items: { selected: boolean }[] }[] }) => {
                  if (data.status === 'submitted') {
                    completeFratOnLeg({ dispatch, newId, trip: tlTrip, leg, actorOid: user.oid, totalScore: data.totalScore });
                    setFratOpenLegId(null);
                  } else if (data.status === 'draft') {
                    saveFratDraftOnLeg({ dispatch, newId, trip: tlTrip, leg, actorOid: user.oid,
                      selections: extractFratSelections(data.items ?? []), mitigationNotes: data.mitigationNotes,
                      nowUtc: new Date().toISOString() });
                    setFratOpenLegId(null);
                    toast.success('FRAT draft saved — resume any time before departure');
                  }
                }}
              />
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
