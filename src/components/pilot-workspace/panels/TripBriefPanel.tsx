import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useSchedulingWorkspace } from '../../scheduling-workspace/SchedulingWorkspaceContext';
import type { TripRecord } from '../../../scheduling/store/types';
import type { SchedulingEvent } from '../../../scheduling/store/types';

export default function TripBriefPanel({ trip }: { trip: TripRecord }) {
  const { store, tick, bump, nowUtc } = useSchedulingWorkspace();
  const [events, setEvents] = useState<SchedulingEvent[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const all = await store.listEventsForTarget({ kind: 'role', value: 'pilot' });
      const forTrip = all.filter((e) => (e.payload as { tripId?: string }).tripId === trip.id);
      if (!cancelled) setEvents(forTrip);
    })();
    return () => { cancelled = true; };
  }, [store, tick, trip]);

  async function ack(e: SchedulingEvent) {
    try {
      await store.updateEvent({ ...e, ackState: 'acked', ackedBy: 'pilot', ackedAtUtc: nowUtc() });
      bump();
    } catch {
      toast.error('Could not acknowledge the brief');
    }
  }

  return (
    <section className="rounded-lg border p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold">Trip brief <span className="text-xs text-muted-foreground">from scheduling</span></h2>
        <a href="/scheduling-workspace" className="text-xs text-primary hover:underline">Open in scheduling ↗</a>
      </div>
      {events.length === 0 && <p className="text-sm text-muted-foreground">No brief delivered yet.</p>}
      <ul className="space-y-2">
        {events.map((e) => (
          <li key={e.id} className="flex items-center justify-between rounded border px-3 py-2">
            <span className="text-sm">{String((e.payload as { title?: string }).title ?? e.type)}</span>
            {e.ackState === 'acked'
              ? <span className="text-xs text-emerald-700">Acknowledged</span>
              : <button onClick={() => ack(e)} className="text-xs rounded bg-primary text-primary-foreground px-2 py-1">Acknowledge</button>}
          </li>
        ))}
      </ul>
    </section>
  );
}
