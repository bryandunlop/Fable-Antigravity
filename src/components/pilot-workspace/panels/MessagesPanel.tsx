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
      // Handoff-completion items are shown read-only in the Trip prep panel now — exclude them
      // here so pilots don't see a duplicate, still-ackable copy of the same item.
      const msgs = all.filter((e) => !e.type.startsWith('handoff:'));
      if (!cancelled) setEvents(msgs);
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

  // Bare content — the slide-over supplies the title (D84). This was a permanent section at the
  // foot of the trip page, which on a 1194x834 iPad put it permanently below the fold.
  return (
    <div>
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
    </div>
  );
}
