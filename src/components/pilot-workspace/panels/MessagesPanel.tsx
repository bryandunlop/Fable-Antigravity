import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useSchedulingWorkspace } from '../../scheduling-workspace/SchedulingWorkspaceContext';
import type { SchedulingEvent } from '../../../scheduling/store/types';

export default function MessagesPanel() {
  const { store, tick, bump, nowUtc } = useSchedulingWorkspace();
  const [events, setEvents] = useState<SchedulingEvent[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const all = await store.listEventsForTarget({ kind: 'role', value: 'pilot' });
      if (!cancelled) setEvents(all);
    })();
    return () => { cancelled = true; };
  }, [store, tick]);

  async function ack(e: SchedulingEvent) {
    try {
      await store.updateEvent({ ...e, ackState: 'acked', ackedBy: 'pilot', ackedAtUtc: nowUtc() });
      bump();
    } catch {
      toast.error('Could not acknowledge');
    }
  }

  return (
    <section className="rounded-lg border p-4">
      <h2 className="font-semibold mb-2">Messages</h2>
      {events.length === 0 && <p className="text-sm text-muted-foreground">No messages.</p>}
      <ul className="space-y-2">
        {events.map((e) => (
          <li key={e.id} className="flex items-center justify-between rounded border px-3 py-2">
            <span className="text-sm">{e.type} · {String((e.payload as { title?: string }).title ?? '')}</span>
            {e.ackable && e.ackState !== 'acked'
              ? <button onClick={() => ack(e)} className="text-xs rounded bg-primary text-primary-foreground px-2 py-1">Ack</button>
              : <span className="text-xs text-muted-foreground">{e.ackState}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
