import React from 'react';
import { Link } from 'react-router-dom';
import { useTechLog } from '../../tech-log/TechLogContext';
import { deriveServiceability } from '../../tech-log/engine/serviceability';
import { deriveCustody } from '../../tech-log/engine/custody';
import type { TripRecord } from '../../../scheduling/store/types';

export default function AircraftAcceptancePanel({ trip }: { trip: TripRecord }) {
  const { state } = useTechLog();
  const now = new Date().toISOString();
  const tlTrip = state.trips.find((t) => t.tripNumber === trip.tripNumber);
  const ac = tlTrip
    ? state.aircraft.find((a) => a.id === tlTrip.aircraftId)
    : state.aircraft.find((a) => a.tailNumber === trip.tail);

  if (!ac) {
    return (
      <section className="rounded-lg border p-4">
        <h2 className="font-semibold mb-2">Aircraft &amp; acceptance</h2>
        <p className="text-sm text-muted-foreground">Not released to preflight yet — no aircraft assigned.</p>
      </section>
    );
  }

  const sv = deriveServiceability(ac.id, state, now);
  const custody = deriveCustody(ac.id, state, now);
  const openDeferrals = state.deferrals.filter((d) => d.aircraftId === ac.id && d.status === 'ACTIVE');

  return (
    <section className="rounded-lg border p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">
          Aircraft &amp; acceptance <span className="text-xs text-muted-foreground">from maintenance</span>
        </h2>
        <Link to={`/tech-log/aircraft/${ac.tailNumber}`} className="text-xs text-primary hover:underline">
          Open in tech-log ↗
        </Link>
      </div>
      <div className="flex gap-4 text-sm">
        <span>
          Serviceability: <strong>{sv.status}</strong>
        </span>
        <span>
          Custody: <strong>{custody.state.replace('_', ' ')}</strong>
        </span>
      </div>
      {openDeferrals.length > 0 && (
        <div className="text-sm">
          <span className="text-muted-foreground">Open MEL/deferrals:</span> {openDeferrals.length}
        </div>
      )}
      {tlTrip && (
        <Link
          to={`/tech-log/trips/${tlTrip.id}`}
          className="inline-block text-xs rounded border px-2 py-1 hover:bg-accent"
        >
          Review &amp; accept aircraft in tech-log ↗
        </Link>
      )}
    </section>
  );
}
