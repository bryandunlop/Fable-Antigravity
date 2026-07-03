import { AlertTriangle, CalendarClock, CheckCircle2, Clock, Inbox, Building2, OctagonAlert, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import type { BoardTrip } from './adapter';
import { clusterRunTasks, type RunBoardModel, type RunGroup, type RunTask, type RunCluster } from './runBoardSelectors';
import { TripIdentityLine } from './TripIdentity';
import { TaskActionButtons } from '../scheduling-workspace/taskRowHelpers';
import type { TaskAction } from '../../scheduling/engine/tasks';

const GROUP_META: Record<RunGroup, { label: string; icon: React.ElementType; accent: string }> = {
  blocked: { label: 'Blocked', icon: OctagonAlert, accent: 'status-error' },
  overdue: { label: 'Overdue', icon: AlertTriangle, accent: 'status-error' },
  'due-today': { label: 'Due today', icon: Clock, accent: 'status-warning' },
  'next-48': { label: 'Coming up', icon: CalendarClock, accent: 'status-info' },
};
const GROUP_ORDER: RunGroup[] = ['blocked', 'overdue', 'due-today', 'next-48'];

export type FunnelFilter = 'blocked' | 'inWork' | 'ready' | 'uninteracted';

/**
 * Action Center — "what needs me now." Within each urgency band, tasks cluster under their TRIP
 * (route + date + tail identity header), so an item is never ambiguous about which flight it
 * belongs to; recurring office work sits in its own clearly-separate cluster. Clicking a trip
 * header or task opens the trip drawer over this view.
 */
export function RunBoard({
  model,
  trips,
  funnelFilters,
  onToggleFunnel,
  onAction,
  onOpenTrip,
}: {
  model: RunBoardModel;
  trips: BoardTrip[];
  funnelFilters: Set<FunnelFilter>;
  onToggleFunnel: (f: FunnelFilter) => void;
  onAction: (task: RunTask, action: TaskAction) => void;
  onOpenTrip: (tripId: string, taskId?: string) => void;
}) {
  const tripOf = new Map(trips.map(t => [t.id, t]));

  const funnelChips: { key: FunnelFilter; label: string; count: number; dot: string }[] = [
    { key: 'blocked', label: 'Blocked', count: model.funnel.blocked, dot: 'bg-[var(--gfo-error,#EF3340)]' },
    { key: 'inWork', label: 'In work', count: model.funnel.inWork, dot: 'bg-blue-500' },
    { key: 'ready', label: 'Ready', count: model.funnel.ready, dot: 'bg-[var(--gfo-success,#00B140)]' },
    { key: 'uninteracted', label: 'Untouched', count: model.funnel.uninteracted, dot: 'bg-muted-foreground/40' },
  ];

  const clusterMatchesFunnel = (c: RunCluster): boolean => {
    if (funnelFilters.size === 0 || c.office) return true;
    const trip = c.tripId ? tripOf.get(c.tripId) : undefined;
    if (!trip) return true;
    const isBlocked = !!trip.criticalBlocker;
    const isReady = trip.readinessScore === 100;
    const isUntouched = trip.readinessScore === 0 && !isBlocked;
    if (funnelFilters.has('blocked') && isBlocked) return true;
    if (funnelFilters.has('ready') && isReady) return true;
    if (funnelFilters.has('uninteracted') && isUntouched) return true;
    if (funnelFilters.has('inWork') && !isBlocked && !isReady && !isUntouched) return true;
    return false;
  };

  let totalShown = 0;

  const sections = GROUP_ORDER.map(g => {
    const meta = GROUP_META[g];
    const clusters = clusterRunTasks(model.groups[g]).filter(clusterMatchesFunnel);
    totalShown += clusters.reduce((n, c) => n + c.tasks.length, 0);
    return { g, meta, clusters };
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Trip-state summary over the horizon; chips filter the clusters below */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-medium text-muted-foreground mr-1">
            {model.funnel.total} trip{model.funnel.total === 1 ? '' : 's'} in horizon
          </span>
          {funnelChips.map(c => (
            <button
              key={c.key}
              onClick={() => onToggleFunnel(c.key)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-medium transition-colors ${funnelFilters.has(c.key) ? 'border-foreground bg-foreground text-background' : 'bg-background text-foreground hover:bg-accent'}`}
            >
              <span className={`w-2 h-2 rounded-full ${c.dot}`} />
              {c.label}
              <span className={funnelFilters.has(c.key) ? 'opacity-80' : 'text-muted-foreground'}>{c.count}</span>
            </button>
          ))}
        </CardContent>
      </Card>

      {sections.map(({ g, meta, clusters }) => {
        const Icon = meta.icon;
        const count = clusters.reduce((n, c) => n + c.tasks.length, 0);
        return (
          <Card key={g}>
            <CardHeader className="py-4">
              <CardTitle className="flex items-center gap-2.5 text-base">
                <span className={`status-badge ${meta.accent} p-1.5`}><Icon className="h-4 w-4" /></span>
                {meta.label}
                <Badge variant={count ? 'secondary' : 'outline'}>{count}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {clusters.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing here.</p>
              ) : (
                clusters.map((c, ci) => {
                  const trip = c.tripId ? tripOf.get(c.tripId) : undefined;
                  return (
                    <div key={c.tripId ?? `office-${ci}`} className="border rounded-lg overflow-hidden">
                      {/* Cluster header: THE trip these tasks belong to */}
                      {c.office ? (
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/50 border-b">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">Office · recurring</span>
                          <span className="text-xs text-muted-foreground">not tied to a trip</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => c.tripId && onOpenTrip(c.tripId)}
                          className="w-full flex items-center justify-between gap-3 px-4 py-2.5 bg-muted/50 border-b text-left hover:bg-accent transition-colors group"
                        >
                          {trip ? (
                            <TripIdentityLine trip={trip} />
                          ) : (
                            <span className="font-medium text-sm">{c.route} · {c.tail} <span className="text-muted-foreground text-xs">{c.tripNumber}</span></span>
                          )}
                          <span className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground shrink-0">
                            Open trip <ChevronRight className="h-3.5 w-3.5" />
                          </span>
                        </button>
                      )}
                      {/* This cluster's tasks */}
                      <div className="divide-y">
                        {c.tasks.map(row => (
                          <div key={row.key} className="px-4 py-2.5 flex flex-wrap items-center gap-3">
                            <button
                              className="flex-1 min-w-[220px] text-left"
                              onClick={() => !row.office && c.tripId && onOpenTrip(c.tripId, row.key)}
                              disabled={row.office}
                            >
                              <span className="font-medium text-sm text-foreground">{row.task.title}</span>
                              <span className="ml-2 text-xs text-muted-foreground">{row.task.ownerRole}</span>
                              <span className={`ml-2 text-xs font-medium ${g === 'blocked' || g === 'overdue' ? 'text-[var(--gfo-error,#EF3340)]' : g === 'due-today' ? 'text-[var(--gfo-warning,#B58514)]' : 'text-muted-foreground'}`}>
                                {row.dueLabel}
                              </span>
                              {row.task.notes && (
                                <div className={`text-xs mt-0.5 ${row.task.status === 'blocked' ? 'text-[var(--gfo-error,#EF3340)]' : 'text-muted-foreground italic'}`}>
                                  "{row.task.notes}"
                                </div>
                              )}
                            </button>
                            <TaskActionButtons instance={row.task} onAction={a => onAction(row, a)} />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        );
      })}

      {totalShown === 0 && (
        <Card>
          <CardContent className="p-12 flex flex-col items-center gap-3 text-muted-foreground">
            {model.funnel.total === 0 ? <Inbox className="h-10 w-10 opacity-40" /> : <CheckCircle2 className="h-10 w-10 text-[var(--gfo-success,#00B140)] opacity-60" />}
            <p className="font-medium">{model.funnel.total === 0 ? 'No trips in this horizon.' : 'All caught up — nothing due.'}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
