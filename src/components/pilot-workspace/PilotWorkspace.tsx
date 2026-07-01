import React, { useState } from 'react';
import { AltimeterSpinner } from '../ui/LoadingSpinners';
import { useSchedulingWorkspace } from '../scheduling-workspace/SchedulingWorkspaceContext';
import MyFlightsPanel from './MyFlightsPanel';
import FlightHub from './FlightHub';
import type { TripRecord } from '../../scheduling/store/types';

export default function PilotWorkspace({ userRole }: { userRole: string; additionalRoles?: string[] }) {
  const { ready } = useSchedulingWorkspace();
  const [selected, setSelected] = useState<TripRecord | null>(null);

  if (!ready) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-64 gap-3">
        <AltimeterSpinner size={32} />
        <p className="text-muted-foreground text-sm">Loading pilot workspace...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Flight Hub</h1>
        <p className="text-muted-foreground">Your brief, your aircraft, your preflight — one place, linked back to every role.</p>
      </div>
      {selected ? (
        <div className="space-y-4">
          <button onClick={() => setSelected(null)} className="text-sm text-primary hover:underline">← My Flights</button>
          <FlightHub trip={selected} userRole={userRole} />
        </div>
      ) : (
        <MyFlightsPanel onOpen={setSelected} />
      )}
    </div>
  );
}
