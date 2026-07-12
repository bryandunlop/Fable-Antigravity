import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { AltimeterSpinner } from '../ui/LoadingSpinners';
import { useSchedulingWorkspace } from '../scheduling-workspace/SchedulingWorkspaceContext';
import MyFlightsPanel from './MyFlightsPanel';
import FlightHub from './FlightHub';
import type { TripRecord } from '../../scheduling/store/types';

/** One trip's Flight Hub, resolved from the :tripId in the URL so the pilot's place survives any
 *  navigation away and back (deep-link / refresh safe). undefined = loading, null = gone. */
function FlightHubRoute({ userRole }: { userRole: string }) {
  const { tripId } = useParams();
  const { store, tick } = useSchedulingWorkspace();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<TripRecord | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const t = tripId ? await store.getTrip(tripId) : null;
      if (!cancelled) setTrip(t);
    })();
    return () => { cancelled = true; };
  }, [store, tripId, tick]);

  const back = (
    <button onClick={() => navigate('/pilot-workspace')} className="text-sm text-primary hover:underline">← My Flights</button>
  );

  if (trip === undefined) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3">
        <AltimeterSpinner size={28} />
        <p className="text-muted-foreground text-sm">Loading trip…</p>
      </div>
    );
  }
  if (trip === null) {
    return <div className="space-y-3"><p className="text-sm text-muted-foreground">That trip is no longer available.</p>{back}</div>;
  }
  return <div className="space-y-4">{back}<FlightHub trip={trip} userRole={userRole} /></div>;
}

export default function PilotWorkspace({ userRole }: { userRole: string; additionalRoles?: string[] }) {
  const { ready } = useSchedulingWorkspace();
  const navigate = useNavigate();

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
      <Routes>
        <Route index element={<MyFlightsPanel onOpen={(t) => navigate(`/pilot-workspace/trips/${t.id}`)} />} />
        <Route path="trips/:tripId" element={<FlightHubRoute userRole={userRole} />} />
        <Route path="*" element={<Navigate to="/pilot-workspace" replace />} />
      </Routes>
    </div>
  );
}
