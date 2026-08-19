import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle, CalendarDays, ChevronRight, ClipboardList, Eye, Inbox as InboxIcon, LayoutList, Loader2, Rows3, Send, Telescope, Tv } from 'lucide-react';
import { Button } from '../ui/button';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { useSchedulingWorkspace } from '../scheduling-workspace/SchedulingWorkspaceContext';
import TemplatesPanel from '../scheduling-workspace/TemplatesPanel';
import InboxPanel from '../scheduling-workspace/InboxPanel';
import ForeFlightPanel from '../scheduling-workspace/ForeFlightPanel';
import PilotVisibilityPanel from '../scheduling-workspace/PilotVisibilityPanel';
import type { TaskAction } from '../../scheduling/engine/tasks';
import { boardTripOf, toBoardTask, type BoardTrip, type BoardTask } from './adapter';
import { readFleetServiceability, readTripServiceabilityAlerts, type TripForAlerts } from '../tech-log/bridge';
import { OpsAlertsPanel } from './OpsAlertsPanel';
import { toTripsForAlerts } from './alertTrips';
import { fleetRowsFor } from './fleet';
import { deriveTripStatus } from './tripStatus';
import { PlanBoard } from './PlanBoard';
import { CalendarView } from './CalendarView';
import { DispatchTable } from './DispatchTable';
import { FilterBar } from './FilterBar';
import { TripDrawer } from './TripDrawer';
import { buildHorizonBoard, officeTasksDueToday, type OverdueItem } from './horizonSelectors';
import { HorizonView } from './HorizonView';
import { matchesTripTypeFilter } from './tripFilters';
import type { TripType } from '../../scheduling/engine';

// One home, four lenses (D87): Horizon (default) / Fleet board / Calendar / List are PROJECTIONS
// of the same filtered trip set — not surfaces with their own content models. The old
// Schedule / Upcoming / Action Center tabs folded into this.
type Lens = 'horizon' | 'board' | 'calendar' | 'list';
type Utility = 'templates' | 'inbox' | 'foreflight' | 'pilot-visibility';

const LENSES: { key: Lens; label: string; icon: React.ElementType }[] = [
  { key: 'horizon', label: 'Horizon', icon: Telescope },
  { key: 'board', label: 'Fleet board', icon: Rows3 },
  { key: 'calendar', label: 'Calendar', icon: CalendarDays },
  { key: 'list', label: 'List', icon: LayoutList },
];

const UTILITY_TABS: { key: Utility; label: string; icon: React.ElementType }[] = [
  { key: 'templates', label: 'Templates', icon: ClipboardList },
  { key: 'inbox', label: 'Inbox', icon: InboxIcon },
  { key: 'foreflight', label: 'ForeFlight', icon: Send },
  { key: 'pilot-visibility', label: 'Pilot visibility', icon: Eye },
];

/** Task-overdue strip — persists across every lens; the only red that isn't aircraft RAG. */
function OverdueStrip({ overdue, onOpenTrip }: { overdue: OverdueItem[]; onOpenTrip: (tripId: string) => void }) {
  if (overdue.length === 0) return null;
  return (
    <button
      onClick={() => onOpenTrip(overdue[0].tripId)}
      className="w-full flex items-center gap-2.5 text-left rounded-md px-3 py-2 border border-[var(--gfo-error,#EF3340)]/40 bg-[var(--gfo-error,#EF3340)]/10 hover:bg-[var(--gfo-error,#EF3340)]/15 transition-colors"
    >
      <AlertTriangle className="h-4 w-4 text-[var(--gfo-error,#EF3340)] shrink-0" />
      <span className="text-xs font-medium text-[var(--gfo-error,#EF3340)]">
        {overdue.length} need{overdue.length === 1 ? 's' : ''} attention now
      </span>
      <span className="text-xs text-muted-foreground truncate">
        {overdue[0].tail} {overdue[0].route} · {overdue[0].actionTitle} · {overdue[0].dueLabel}
        {overdue.length > 1 ? ` · +${overdue.length - 1} more` : ''}
      </span>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground ml-auto shrink-0" />
    </button>
  );
}

/**
 * The scheduling hub, in the GFO design language. ONE home with four lenses over the same
 * filtered trips — Horizon ("what's coming, keyed by when work is due", the default), Fleet board
 * (tail × time), Calendar, List — plus quiet utility panels. The overdue strip and serviceability
 * alerts persist across lenses. Trips arrive from the myairops sync — there is no manual
 * trip-creation path here. Every trip reference opens the Trip Drawer over the current lens.
 */
export default function SchedulingCommandCenter({
  userRole = 'scheduling',
  additionalRoles = [],
}: {
  userRole?: string;
  additionalRoles?: string[];
}) {
  const { service, store, ready, tick, bump, nowUtc, officeTzOffsetMinutes } = useSchedulingWorkspace();

  const [lens, setLens] = useState<Lens>('horizon');
  const [utility, setUtility] = useState<Utility | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [tailFilter, setTailFilter] = useState<Set<string>>(new Set());
  const [tripTypeFilter, setTripTypeFilter] = useState<Set<TripType>>(new Set());
  const [actionRequiredOnly, setActionRequiredOnly] = useState(false);
  const [horizonDays, setHorizonDays] = useState(30);
  const [drawer, setDrawer] = useState<{ tripId: string; taskId?: string } | null>(null);

  const [trips, setTrips] = useState<BoardTrip[]>([]);
  const [alertTrips, setAlertTrips] = useState<TripForAlerts[]>([]);
  const [officeTasks, setOfficeTasks] = useState<BoardTask[]>([]);
  const generatedRunBoard = useRef(false);

  const nowMs = Date.now();

  // Real data: trips + their instances → BoardTrips (readiness derived by the engine).
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      const rows = await store.listTrips();
      const board = await Promise.all(rows.map(async t => boardTripOf(t, await store.listInstancesForTrip(t.id))));
      if (!cancelled) {
        setTrips(board);
        // Raw legs feed the serviceability-alert join (BoardTrip drops them).
        setAlertTrips(toTripsForAlerts(rows));
      }
    })();
    return () => { cancelled = true; };
  }, [store, ready, tick]);

  // Recurring office tasks: instantiate today's run-board once (idempotent), then read per tick.
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      if (!generatedRunBoard.current) {
        generatedRunBoard.current = true;
        await service.generateRunBoard(nowUtc());
      }
      const local = new Date(Date.now() + officeTzOffsetMinutes * 60_000);
      const runDate = local.toISOString().slice(0, 10);
      const instances = await store.listRecurringInstances(runDate);
      if (!cancelled) setOfficeTasks(instances.map(toBoardTask));
    })();
    return () => { cancelled = true; };
  }, [service, store, ready, tick, nowUtc, officeTzOffsetMinutes]);

  // Tail-row status dots: the tech-log DERIVED serviceability projection (§14.2), never a stored
  // flag — re-read per tick in case a release or rectification touched tech-log state.
  const fleetServiceability = useMemo(() => readFleetServiceability(nowUtc()), [nowUtc, tick]);

  // Trip-vs-serviceability collisions (RED at ETD, MEL clock out mid-trip, active-deferral info) —
  // same derived projection, evaluated at each trip's departure times.
  const opsAlerts = useMemo(
    () => readTripServiceabilityAlerts(alertTrips, nowUtc()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [alertTrips, nowUtc, tick],
  );

  const filteredTrips = useMemo(() => trips.filter(t => {
    if (tailFilter.size > 0 && !tailFilter.has(t.aircraft)) return false;
    if (!matchesTripTypeFilter(t.tripType, tripTypeFilter)) return false;
    if (actionRequiredOnly) {
      const s = deriveTripStatus(t, nowMs);
      if (s !== 'blocked' && s !== 'behind' && s !== 'attention' && s !== 'uninteracted') return false;
    }
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      if (!t.tripNumber.toLowerCase().includes(s) && !t.client.toLowerCase().includes(s) &&
          !t.aircraft.toLowerCase().includes(s) && !t.route.toLowerCase().includes(s)) return false;
    }
    return true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [trips, tailFilter, tripTypeFilter, actionRequiredOnly, searchTerm]);

  const horizonModel = useMemo(
    () => buildHorizonBoard(filteredTrips, nowMs, horizonDays),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredTrips, horizonDays],
  );

  const officeToday = useMemo(
    () => officeTasksDueToday(officeTasks, nowMs),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [officeTasks],
  );

  const openTrip = (tripId: string, taskId?: string) => setDrawer({ tripId, taskId });
  const onTaskAction = async (task: BoardTask, action: TaskAction) => {
    try {
      await service.applyAction(task.id, action, userRole, nowUtc());
      bump();
    } catch (err) {
      toast.error(`Couldn't ${action.kind} task: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  };
  const toggleTail = (tail: string) =>
    setTailFilter(prev => { const s = new Set(prev); s.has(tail) ? s.delete(tail) : s.add(tail); return s; });
  const toggleTripType = (t: TripType) =>
    setTripTypeFilter(prev => { const s = new Set(prev); s.has(t) ? s.delete(t) : s.add(t); return s; });

  if (!ready) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const onLensSurface = utility === null;

  return (
    <div className="space-y-4">
      {/* Page header — standard GFO chrome. No New-trip: trips arrive from the myairops sync. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Scheduling</h1>
          <p className="text-sm text-muted-foreground">
            {trips.length} trips · synced from myairops · readiness derived live from checklist state
          </p>
        </div>
        <Button variant="outline" size="sm" asChild className="text-muted-foreground">
          <Link to="/scheduling-wall"><Tv className="h-4 w-4 mr-1.5" /> Ops wall</Link>
        </Button>
      </div>

      {/* The lens switch: four projections of the same trips + quiet utilities */}
      <div className="flex flex-wrap items-center gap-3 border-b pb-px">
        <Tabs value={onLensSurface ? lens : ''} className="w-auto">
          <TabsList>
            {LENSES.map(({ key, label, icon: Icon }) => (
              <TabsTrigger key={key} value={key} onClick={() => { setLens(key); setUtility(null); }}>
                <Icon className="h-4 w-4 mr-1.5" /> {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-1 ml-auto">
          {UTILITY_TABS.map(({ key, label, icon: Icon }) => (
            <Button
              key={key}
              variant={utility === key ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setUtility(prev => (prev === key ? null : key))}
              className="text-muted-foreground data-[active]:text-foreground"
            >
              <Icon className="h-4 w-4 mr-1.5" /> {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Persist across every lens: serviceability alerts (aircraft RAG) + task-overdue strip. */}
      {onLensSurface && <OpsAlertsPanel alerts={opsAlerts} onOpenTrip={openTrip} />}
      {onLensSurface && <OverdueStrip overdue={horizonModel.overdue} onOpenTrip={openTrip} />}

      {onLensSurface && (
        <FilterBar
          fleet={fleetRowsFor(trips)}
          searchTerm={searchTerm} onSearch={setSearchTerm}
          tailFilter={tailFilter} onToggleTail={toggleTail}
          tripTypeFilter={tripTypeFilter} onToggleTripType={toggleTripType}
          actionRequiredOnly={actionRequiredOnly} onActionRequired={setActionRequiredOnly}
          horizonDays={horizonDays} onHorizon={setHorizonDays}
        />
      )}

      {/* Active lens */}
      {onLensSurface && lens === 'horizon' && (
        <HorizonView
          model={horizonModel} officeToday={officeToday}
          nowMs={nowMs} horizonDays={horizonDays}
          onOpenTrip={openTrip} onOfficeAction={onTaskAction}
        />
      )}
      {onLensSurface && lens === 'board' && (
        <PlanBoard trips={filteredTrips} nowMs={nowMs} serviceability={fleetServiceability} onTripClick={t => openTrip(t.id)} />
      )}
      {onLensSurface && lens === 'calendar' && (
        <CalendarView trips={filteredTrips} nowMs={nowMs} onTripClick={t => openTrip(t.id)} />
      )}
      {onLensSurface && lens === 'list' && (
        <DispatchTable trips={filteredTrips} nowMs={nowMs} onTripClick={t => openTrip(t.id)} />
      )}
      {utility === 'templates' && <TemplatesPanel userRole={userRole} additionalRoles={additionalRoles} />}
      {utility === 'inbox' && <InboxPanel defaultTargetRole="pilot" />}
      {utility === 'foreflight' && <ForeFlightPanel />}
      {utility === 'pilot-visibility' && <PilotVisibilityPanel />}

      {/* The trip workspace, over whichever lens you're in */}
      <TripDrawer
        tripId={drawer?.tripId ?? null}
        focusTaskId={drawer?.taskId}
        open={!!drawer}
        onOpenChange={o => { if (!o) setDrawer(null); }}
        userRole={userRole}
      />
    </div>
  );
}
