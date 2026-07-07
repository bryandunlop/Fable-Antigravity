import { useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Clock, Inbox } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { TripIdentityLine } from './TripIdentity';
import type { UpcomingLane, UpcomingModel, UpcomingTrip } from './upcomingLanesSelectors';

const LANE_META: Record<UpcomingLane, { label: string; dot: string }> = {
  'this-week': { label: 'This week', dot: 'bg-[var(--gfo-info,#2F80ED)]' },
  'next-week': { label: 'Next week', dot: 'bg-muted-foreground/50' },
  later: { label: 'Later this month', dot: 'bg-muted-foreground/30' },
};
const LANE_ORDER: UpcomingLane[] = ['this-week', 'next-week', 'later'];
const PREVIEW = 6;

function TripActionCard({ item, onOpenTrip }: { item: UpcomingTrip; onOpenTrip: (id: string, taskId?: string) => void }) {
  const { trip, soonest, countInWindow, quiet } = item;
  return (
    <button
      onClick={() => onOpenTrip(trip.id, soonest?.key)}
      className={`w-full text-left border rounded-lg px-3 py-2.5 hover:bg-accent transition-colors ${quiet ? 'bg-muted/30' : 'bg-background'}`}
    >
      <TripIdentityLine trip={trip} />
      <div className="mt-2">
        {quiet ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-[var(--gfo-success,#00B140)]" /> on track
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium status-badge status-info px-2 py-1 rounded-md">
            <Clock className="h-3.5 w-3.5" />
            {soonest!.title} · {soonest!.dueLabel}
            {countInWindow > 1 ? ` · ${countInWindow} items` : ''}
          </span>
        )}
      </div>
    </button>
  );
}

function Lane({ lane, items, onOpenTrip }: { lane: UpcomingLane; items: UpcomingTrip[]; onOpenTrip: (id: string, taskId?: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const meta = LANE_META[lane];
  const shown = expanded ? items : items.slice(0, PREVIEW);
  const hidden = items.length - shown.length;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2 px-1">
        <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
        <span className="text-sm font-medium">{meta.label}</span>
        <span className="text-xs text-muted-foreground">{items.length} trip{items.length === 1 ? '' : 's'}</span>
      </div>
      {shown.map(item => (
        <TripActionCard key={item.trip.id} item={item} onOpenTrip={onOpenTrip} />
      ))}
      {items.length === 0 && <p className="text-xs text-muted-foreground px-1 py-2">Nothing here.</p>}
      {hidden > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="flex items-center justify-center gap-1.5 text-xs font-medium text-[var(--gfo-info,#2F80ED)] border border-dashed rounded-md py-1.5 hover:bg-accent transition-colors"
        >
          <ChevronDown className="h-3.5 w-3.5" /> {hidden} more
        </button>
      )}
    </div>
  );
}

/**
 * Upcoming — "what's coming up." Forward triage lanes keyed by when work is due; overdue is a slim
 * strip, not a lane. Each card is a trip badged with its soonest action; a "N more" prompt reveals
 * anything below the fold. Clicking a card opens the trip drawer, focused on its soonest action.
 */
export function UpcomingLanes({ model, onOpenTrip }: { model: UpcomingModel; onOpenTrip: (tripId: string, taskId?: string) => void }) {
  const laneTotal = LANE_ORDER.reduce((n, l) => n + model.lanes[l].length, 0);

  return (
    <div className="flex flex-col gap-4">
      {model.overdue.length > 0 && (
        <button
          onClick={() => onOpenTrip(model.overdue[0].tripId)}
          className="flex items-center gap-2.5 text-left rounded-md px-3 py-2 border border-[var(--gfo-error,#EF3340)]/40 bg-[var(--gfo-error,#EF3340)]/10 hover:bg-[var(--gfo-error,#EF3340)]/15 transition-colors"
        >
          <AlertTriangle className="h-4 w-4 text-[var(--gfo-error,#EF3340)] shrink-0" />
          <span className="text-xs font-medium text-[var(--gfo-error,#EF3340)]">
            {model.overdue.length} need{model.overdue.length === 1 ? 's' : ''} attention now
          </span>
          <span className="text-xs text-muted-foreground truncate">
            {model.overdue[0].tail} {model.overdue[0].route} · {model.overdue[0].actionTitle} · {model.overdue[0].dueLabel}
            {model.overdue.length > 1 ? ` · +${model.overdue.length - 1} more` : ''}
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground ml-auto shrink-0" />
        </button>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {LANE_ORDER.map(lane => (
          <Lane key={lane} lane={lane} items={model.lanes[lane]} onOpenTrip={onOpenTrip} />
        ))}
      </div>

      {laneTotal === 0 && model.overdue.length === 0 && (
        <Card>
          <CardContent className="p-12 flex flex-col items-center gap-3 text-muted-foreground">
            {model.totalTrips === 0 ? <Inbox className="h-10 w-10 opacity-40" /> : <CheckCircle2 className="h-10 w-10 text-[var(--gfo-success,#00B140)] opacity-60" />}
            <p className="font-medium">{model.totalTrips === 0 ? 'No trips in this horizon.' : 'Nothing coming up — all caught up.'}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
