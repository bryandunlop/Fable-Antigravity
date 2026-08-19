import { useState } from 'react';
import { ChevronDown, ChevronRight, Clock, OctagonAlert } from 'lucide-react';
import type { TripServiceabilityAlert } from '../tech-log/bridge';
import { groupAlertsByAircraft } from './alertGroups';
import { OpsAlertsPanel } from './OpsAlertsPanel';
import type { OverdueItem } from './horizonSelectors';

// ONE attention band (D87 declutter, Bryan 2026-08-19): two collapsed segments — aircraft
// serviceability (RAG language) and task urgency — that expand in place. The two color languages
// stay side by side but never blend: red on the left segment IS aircraft RAG semantics; red on
// the right is task lateness. Collapsed, the pair costs ~44px where the old stack of alert cards
// plus overdue strip cost ~300px.

function Segment({ icon, strong, rest, expanded, onToggle, children }: {
  icon: React.ReactNode;
  strong: string;
  rest: string;
  expanded: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2.5 text-left rounded-md px-3 py-2 border border-[var(--gfo-error,#EF3340)]/40 bg-card hover:bg-[var(--gfo-error,#EF3340)]/5 transition-colors"
      >
        {icon}
        <span className="text-xs min-w-0 truncate">
          <span className="font-semibold">{strong}</span>{' '}
          <span className="text-muted-foreground">{rest}</span>
        </span>
        {expanded
          ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-auto shrink-0" />
          : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground ml-auto shrink-0" />}
      </button>
      {expanded && <div className="mt-2">{children}</div>}
    </div>
  );
}

export function AttentionBand({ alerts, overdue, onOpenTrip }: {
  alerts: TripServiceabilityAlert[];
  overdue: OverdueItem[];
  onOpenTrip: (tripId: string, taskId?: string) => void;
}) {
  const [aircraftOpen, setAircraftOpen] = useState(false);
  const [tasksOpen, setTasksOpen] = useState(false);

  const groups = groupAlertsByAircraft(alerts);
  const hasAircraft = groups.length > 0;
  const hasTasks = overdue.length > 0;
  if (!hasAircraft && !hasTasks) return null;

  const aircraftSummary = groups
    .map(g => `${g.tail} ${g.headline.length > 34 ? `${g.headline.slice(0, 34)}…` : g.headline}`)
    .slice(0, 3)
    .join(' · ');

  return (
    <div className={`grid gap-2.5 ${hasAircraft && hasTasks ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
      {hasAircraft && (
        <Segment
          icon={<OctagonAlert className="h-4 w-4 text-red-600 shrink-0" />}
          strong={`Aircraft — ${groups.length} affect ${alerts.length} trip${alerts.length === 1 ? '' : 's'}.`}
          rest={aircraftSummary}
          expanded={aircraftOpen}
          onToggle={() => setAircraftOpen(v => !v)}
        >
          <OpsAlertsPanel alerts={alerts} onOpenTrip={onOpenTrip} />
        </Segment>
      )}
      {hasTasks && (
        <Segment
          icon={<Clock className="h-4 w-4 text-[var(--gfo-error,#EF3340)] shrink-0" />}
          strong={`Tasks — ${overdue.length} overdue.`}
          rest={`worst ${overdue[0].dueLabel.replace('Overdue ', '')}: ${overdue[0].actionTitle} · ${overdue[0].tail} ${overdue[0].route}`}
          expanded={tasksOpen}
          onToggle={() => setTasksOpen(v => !v)}
        >
          <div className="rounded-lg border bg-card divide-y">
            {overdue.map(o => (
              <button key={o.tripId} onClick={() => onOpenTrip(o.tripId)}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left hover:bg-accent transition-colors">
                <span className="text-xs font-semibold text-[var(--gfo-error,#EF3340)] shrink-0">{o.dueLabel}</span>
                <span className="text-xs truncate">{o.actionTitle}</span>
                <span className="text-xs text-muted-foreground ml-auto shrink-0">
                  {o.tail} {o.route} · {o.tripNumber}{o.overdueCount > 1 ? ` · +${o.overdueCount - 1}` : ''}
                </span>
              </button>
            ))}
          </div>
        </Segment>
      )}
    </div>
  );
}
