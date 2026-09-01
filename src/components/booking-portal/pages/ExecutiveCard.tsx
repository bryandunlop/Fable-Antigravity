// The executive's whole app. One phone-shaped card per trip and nothing else.
//
// He is not a scheduler and not an EA: he wants to know whether he is flying, roughly how
// tight it is, and how to ask his assistant a question. Everything else on this platform
// is somebody's job, not his.
//
// Two rules hold here absolutely: no other executive is ever named, at any density; and
// no tail is ever shown, because the aircraft is scheduling's to assign.

import { MessageSquare } from 'lucide-react';
import { Button } from '../../ui/button';
import { PortalShell } from '../components/PortalShell';
import { MessageThread } from '../components/MessageThread';
import { usePortal } from '../BookingPortalContext';
import { useSchedulingWorkspace } from '../../scheduling-workspace/SchedulingWorkspaceContext';
import { useTrips } from '../../hooks/useFleetAvailability';
import { useFreeCounts, monthKey } from '../hooks/useFreeCounts';
import { addMonths } from '../../inflight/tripCalendar';
import { cardsFor } from '../engine/executiveCard';
import { EXECUTIVE_PRINCIPAL_ID, EA_NAME } from '../mockData';
import { useMemo, useState } from 'react';
import { cn } from '../../ui/utils';

export default function ExecutiveCardPage() {
  const { state } = usePortal();
  const { nowUtc } = useSchedulingWorkspace();
  const trips = useTrips();
  const now = nowUtc();
  const today = useMemo(() => new Date(), []);
  const [asking, setAsking] = useState<string | null>(null);

  const months = useMemo(
    () => Array.from({ length: 15 }, (_, i) => addMonths(today.getFullYear(), today.getMonth(), i)),
    [today],
  );
  const counts = useFreeCounts(trips, now, months);
  // Every month shares one index, so any of them carries the whole horizon.
  const byDate = counts[monthKey(today.getFullYear(), today.getMonth())]?.byDate ?? {};

  const cards = useMemo(
    () => cardsFor(state.requests, EXECUTIVE_PRINCIPAL_ID, byDate),
    [state.requests, byDate],
  );

  return (
    <PortalShell title="Your travel">
      <div className="mx-auto flex w-full max-w-[420px] flex-col gap-3">
        {cards.length === 0 && (
          <p className="text-sm text-muted-foreground">Nothing booked or asked for.</p>
        )}

        {cards.map(card => (
          <div key={card.requestId} className="rounded-xl border p-4 shadow-sm">
            <p
              className={cn(
                'text-[11px] font-semibold uppercase tracking-[0.15em]',
                card.headline === 'CONFIRMED'
                  ? 'text-[var(--gfo-daylight-deep,#0077CC)]'
                  : 'text-muted-foreground',
              )}
            >
              {card.headline}
            </p>
            <h2 className="mt-0.5 text-lg font-semibold">{card.trip}</h2>
            <p className="text-sm text-muted-foreground">{card.dates}</p>

            <p className="mt-3 text-sm">{card.scarcity.line}</p>
            {card.note && <p className="mt-1.5 text-sm italic text-muted-foreground">{card.note}</p>}

            <Button
              size="sm"
              variant="outline"
              className="mt-3 w-full"
              onClick={() => setAsking(asking === card.requestId ? null : card.requestId)}
            >
              <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
              Message {EA_NAME.split(' ')[0]}
            </Button>

            {asking === card.requestId && (
              <div className="mt-3 border-t pt-3">
                <MessageThread
                  messages={state.requests.find(r => r.id === card.requestId)?.messages ?? []}
                  threadId={card.requestId}
                  label={`You ↔ ${EA_NAME.split(' ')[0]}`}
                  emptyHint="Nothing yet. Ask anything."
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </PortalShell>
  );
}
