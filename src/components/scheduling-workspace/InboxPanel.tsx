import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Inbox, Check } from 'lucide-react';
import { useSchedulingWorkspace } from './SchedulingWorkspaceContext';
import type { SchedulingEvent } from '../../scheduling/store';
import { formatDueTime } from './taskRowHelpers';

interface InboxPanelProps {
  defaultTargetRole?: string;
}

const TARGET_ROLE_OPTIONS = [
  { value: 'pilot', label: 'Pilot' },
  { value: 'scheduling', label: 'Scheduling' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'executive-assistant', label: 'Executive Assistant' },
];

function ackBadgeClassName(ackState: SchedulingEvent['ackState']): string {
  switch (ackState) {
    case 'acked': return 'bg-green-600 text-white border-transparent';
    case 'pending': return 'bg-amber-500 text-white border-transparent';
    case 'n_a':
    default: return 'bg-muted text-muted-foreground border-transparent';
  }
}

export default function InboxPanel({ defaultTargetRole = 'pilot' }: InboxPanelProps) {
  const { store, tick, bump, nowUtc } = useSchedulingWorkspace();
  const [targetRole, setTargetRole] = useState(defaultTargetRole);
  const [events, setEvents] = useState<SchedulingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    store.listEventsForTarget({ kind: 'role', value: targetRole }).then((rows) => {
      if (cancelled) return;
      setEvents(rows.slice().sort((a, b) => b.createdAtUtc.localeCompare(a.createdAtUtc)));
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [store, targetRole, tick]);

  async function handleAcknowledge(event: SchedulingEvent) {
    const actor = targetRole; // stand-in actor identity: the acking role itself
    await store.updateEvent({
      ...event, ackState: 'acked', ackedBy: actor, ackedAtUtc: nowUtc(),
    });
    bump();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 flex-wrap gap-2">
        <div>
          <CardTitle>Handoff inbox</CardTitle>
          <CardDescription>Events routed to another department — the weave made visible</CardDescription>
        </div>
        <Select value={targetRole} onValueChange={setTargetRole}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            {TARGET_ROLE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : events.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Inbox className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No events for {targetRole}.</p>
            <p className="text-sm">Complete a handoff task (e.g. crew brief) or trigger an escalation to see events here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((event) => (
              <div key={event.id} className="flex items-center justify-between gap-4 border rounded-md p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground">{event.type}</span>
                    <Badge className={ackBadgeClassName(event.ackState)}>{event.ackState}</Badge>
                    <Badge variant="outline">{event.channel}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    From {event.sourceDept} · {event.entityRef.kind} {event.entityRef.id} · {formatDueTime(event.createdAtUtc)}
                  </div>
                  {Object.keys(event.payload).length > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {Object.entries(event.payload).map(([k, v]) => `${k}: ${String(v)}`).join(' · ')}
                    </div>
                  )}
                </div>
                {event.ackable && event.ackState === 'pending' && (
                  <Button size="sm" onClick={() => handleAcknowledge(event)}>
                    <Check className="h-3.5 w-3.5 mr-1" /> Acknowledge
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
