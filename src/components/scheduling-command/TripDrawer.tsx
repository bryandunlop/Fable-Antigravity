import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ExternalLink, Send } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../ui/sheet';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Separator } from '../ui/separator';
import { useSchedulingWorkspace } from '../scheduling-workspace/SchedulingWorkspaceContext';
import { StatusBadge, AckBadge, TaskActionButtons, formatDueTime, groupByCategory } from '../scheduling-workspace/taskRowHelpers';
import { useRehydrateTechLog } from '../tech-log/TechLogContext';
import { releaseSchedulingTripToPreflight, readPreflightSummary } from '../tech-log/bridge';
import type { TripRecord } from '../../scheduling/store';
import type { TaskInstance, TaskAction, Readiness } from '../../scheduling/engine';
import { boardTripOf } from './adapter';
import { TripIdentityHeader } from './TripIdentity';

function readinessBadgeClassName(state: Readiness['state']): string {
  switch (state) {
    case 'READY': return 'status-success';
    case 'BLOCKED': return 'status-error';
    case 'NOT_READY':
    default: return 'status-warning';
  }
}

/**
 * The trip workspace, as a drawer over whichever board you came from — close it and you're back
 * exactly where you were. The identity header (route + dates + tail) makes it unmistakable which
 * trip's checklist you are working; an optional focus task is scrolled to and flashed.
 */
export function TripDrawer({
  tripId,
  focusTaskId,
  open,
  onOpenChange,
  userRole,
}: {
  tripId: string | null;
  focusTaskId?: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  userRole: string;
}) {
  const { service, store, tick, bump, nowUtc } = useSchedulingWorkspace();
  const rehydrateTechLog = useRehydrateTechLog();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<TripRecord | null>(null);
  const [instances, setInstances] = useState<TaskInstance[]>([]);
  const [readiness, setReadiness] = useState<Readiness | null>(null);

  useEffect(() => {
    if (!tripId || !open) return;
    let cancelled = false;
    (async () => {
      const [t, xs, r] = await Promise.all([
        store.getTrip(tripId),
        store.listInstancesForTrip(tripId),
        service.tripReadiness(tripId),
      ]);
      if (cancelled) return;
      setTrip(t);
      setInstances(xs);
      setReadiness(r);
    })();
    return () => { cancelled = true; };
  }, [store, service, tripId, open, tick]);

  // Scroll to + flash the focused task once content is loaded.
  useEffect(() => {
    if (!open || !focusTaskId || instances.length === 0) return;
    const t = window.setTimeout(() => {
      const el = document.getElementById(`drawer-task-${focusTaskId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-[var(--gfo-warning,#F1B434)]', 'ring-offset-1');
        window.setTimeout(() => el.classList.remove('ring-2', 'ring-[var(--gfo-warning,#F1B434)]', 'ring-offset-1'), 2500);
      }
    }, 250);
    return () => window.clearTimeout(t);
  }, [open, focusTaskId, instances.length]);

  const identity = useMemo(() => (trip ? boardTripOf(trip, instances) : null), [trip, instances]);
  const preflight = useMemo(() => (trip ? readPreflightSummary(trip.tripNumber) : null), [trip, tick]);
  const grouped = useMemo(() => groupByCategory(instances), [instances]);
  const blockedIds = useMemo(() => new Set(instances.filter(i => i.status === 'blocked').map(i => i.id)), [instances]);

  async function handleAction(instanceId: string, action: TaskAction) {
    try {
      await service.applyAction(instanceId, action, userRole, nowUtc());
      bump();
    } catch (err) {
      toast.error(`Couldn't ${action.kind} task: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }

  function handleRelease() {
    if (!trip) return;
    try {
      const { createdAircraft } = releaseSchedulingTripToPreflight({
        tripNumber: trip.tripNumber,
        name: trip.tripNumber,
        tail: trip.tail,
        aircraftType: trip.aircraftType,
        createdByOid: userRole ?? 'scheduling',
        nowUtc: nowUtc(),
        legs: trip.legs.map(l => ({
          sequence: l.sequence, departureIcao: l.departureIcao, arrivalIcao: l.arrivalIcao,
          departureTimeUtc: l.departureTimeUtc, arrivalTimeUtc: l.arrivalTimeUtc,
        })),
      });
      // Same seam as TripsPanel: the bridge writes storage, not the reducer.
      rehydrateTechLog();
      toast[createdAircraft ? 'warning' : 'success'](
        createdAircraft
          ? `Released — no fleet aircraft for ${trip.tail}, created a demo placeholder`
          : 'Released to preflight',
      );
      bump();
    } catch (err) {
      toast.error(`Couldn't release to preflight: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-6">
        {/* Above the loading branch on purpose (LG-30). Radix asserts a Title on the
            dialog at MOUNT, and the drawer mounts before the trip resolves — a Title
            that lives only in the loaded branch is a console error on every open.
            The visible name is the identity header; this is its accessible twin. */}
        <SheetTitle className="sr-only">
          {identity ? `Trip ${identity.route}` : 'Loading trip'}
        </SheetTitle>
        {/* Same reasoning for the description: Radix looks for it at mount too. */}
        <SheetDescription className="sr-only">
          {identity
            ? `Readiness, crew and anything blocking departure for ${identity.route}.`
            : 'Loading the trip detail.'}
        </SheetDescription>
        {!trip || !identity ? (
          <p className="text-sm text-muted-foreground py-10 text-center">Loading trip…</p>
        ) : (
          <div className="space-y-5">
            <SheetHeader className="space-y-3 text-left">
              <TripIdentityHeader trip={identity} />
              {readiness && (
                <div className="flex items-center gap-3">
                  <span className={`status-badge ${readinessBadgeClassName(readiness.state)}`}>{readiness.state.replace('_', ' ')}</span>
                  <Progress value={readiness.completion * 100} className="w-44" />
                  <span className="text-xs text-muted-foreground">{Math.round(readiness.completion * 100)}% complete</span>
                </div>
              )}
              {identity.criticalBlocker && (
                <p className="text-sm text-[var(--gfo-error,#EF3340)] font-medium">Blocked: {identity.criticalBlocker}</p>
              )}
            </SheetHeader>

            <Separator />

            {/* Legs */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Legs</h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                {trip.legs.map(leg => (
                  <div key={leg.id}>
                    Leg {leg.sequence}: {leg.departureIcao} → {leg.arrivalIcao} · dep {formatDueTime(leg.departureTimeUtc)} · {leg.paxCount} pax
                  </div>
                ))}
              </div>
            </div>

            {/* Preflight bridge */}
            <div className="flex items-center justify-between gap-3 border rounded-md p-3">
              <div className="text-sm">
                <div className="font-medium">Crew preflight</div>
                <div className="text-xs text-muted-foreground">
                  {preflight ? `Released · ${preflight.overall}` : 'Not yet released to the crew\'s tech-log preflight flow.'}
                </div>
              </div>
              {preflight ? (
                <Button variant="outline" size="sm" onClick={() => navigate('/tech-log/trips/' + preflight.techLogTripId)}>
                  Open preflight <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              ) : (
                <Button size="sm" onClick={handleRelease}>
                  <Send className="h-3.5 w-3.5 mr-1.5" /> Release to preflight
                </Button>
              )}
            </div>

            <Separator />

            {/* Checklist — THE checklist for THIS trip */}
            <div className="space-y-5">
              <h3 className="text-sm font-semibold">
                Trip checklist
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {instances.length} items · every item below belongs to {identity.route} ({trip.tripNumber})
                </span>
              </h3>
              {instances.length === 0 ? (
                <p className="text-sm text-muted-foreground">No checklist instantiated for this trip type.</p>
              ) : (
                grouped.map(([category, rows]) => (
                  <div key={category} className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {category.replace(/-/g, ' ')}
                    </h4>
                    <div className="space-y-2">
                      {rows.map(inst => (
                        <div
                          key={inst.id}
                          id={`drawer-task-${inst.id}`}
                          className={`flex items-center justify-between gap-4 border rounded-md p-3 transition-shadow ${blockedIds.has(inst.id) ? 'border-[var(--gfo-error,#EF3340)]/40 bg-[var(--gfo-error,#EF3340)]/5' : ''}`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-foreground">{inst.title}</span>
                              <StatusBadge status={inst.status} />
                              {inst.requiresAck && <AckBadge ackState={inst.ackState} />}
                            </div>
                            <div className="text-xs mt-1 text-muted-foreground">
                              Owner: {inst.ownerRole} · Due {formatDueTime(inst.dueAtUtc)}
                              {inst.handoffTarget && ` · Hands off to ${inst.handoffTarget.value}`}
                              {inst.notes && ` · "${inst.notes}"`}
                            </div>
                          </div>
                          <TaskActionButtons instance={inst} onAction={a => handleAction(inst.id, a)} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
