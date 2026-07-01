import React from 'react';
import type { TripRecord } from '../../scheduling/store/types';

export default function FlightHub({ trip }: { trip: TripRecord; userRole: string }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4">
        <div className="font-semibold">{trip.tripNumber} · {trip.tail} · {trip.aircraftType}</div>
        <div className="text-sm text-muted-foreground">{trip.tripType} · {trip.legs?.length ?? 0} legs</div>
      </div>
      {/* ReadinessBar + panels added in Tasks 4–8 */}
    </div>
  );
}
