import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { CalendarClock, CalendarDays, ClipboardList, Inbox as InboxIcon, LayoutList, ListChecks, Loader2, Plus, Rows3, Send } from 'lucide-react';
import { Button } from '../ui/button';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { useSchedulingWorkspace } from '../scheduling-workspace/SchedulingWorkspaceContext';
import TemplatesPanel from '../scheduling-workspace/TemplatesPanel';
import InboxPanel from '../scheduling-workspace/InboxPanel';
import ForeFlightPanel from '../scheduling-workspace/ForeFlightPanel';
import type { TaskAction } from '../../scheduling/engine/tasks';
import { boardTripOf, toBoardTask, type BoardTrip, type BoardTask } from './adapter';
import { readFleetServiceability } from '../tech-log/bridge';
import { fleetRowsFor } from './fleet';
import { deriveTripStatus } from './tripStatus';
import { PlanBoard } from './PlanBoard';
import { RunBoard, type FunnelFilter } from './RunBoard';
import { CalendarView } from './CalendarView';
import { DispatchTable } from './DispatchTable';
import { FilterBar } from './FilterBar';
import { TripDrawer } from './TripDrawer';
import { NewTripDialog } from './NewTripDialog';
import { buildRunBoard, type RunTask } from './runBoardSelectors';
import { buildUpcomingBoard } from './upcomingLanesSelectors';
import { UpcomingLanes } from './UpcomingLanes';
import { matchesTripTypeFilter } from './tripFilters';
import type { TripType } from '../../scheduling/engine';

type Surface = 'schedule' | 'upcoming' | 'action' | 'templates' | 'inbox' | 'foreflight';
type ScheduleView = 'board' | 'calendar' | 'list';

const UTILITY_TABS: { key: Surface; label: string; icon: React.ElementType }[] = [
  { key: 'templates', label: 'Templates', icon: ClipboardList },
  { key: 'inbox', label: 'Inbox', icon: InboxIcon },
  { key: 'foreflight', label: 'ForeFlight', icon: Send },
];

/**
 * The scheduling hub, in the GFO design language. Two primary surfaces — Schedule (plan board /
 * calendar / list views of the same trips: "where is everything") and Action Center (trip-clustered
 * due work: "what needs me now") — plus quiet utility panels. Every trip reference opens the Trip
 * Drawer over the current view, so the scheduler never loses their place and always sees exactly
 * which trip's checklist they're working.
 */
export default function SchedulingCommandCenter({
  userRole = 'scheduling',
  additionalRoles = [],
}: {
  userRole?: string;
  additionalRoles?: string[];
}) {
  const { service, store, ready, tick, bump, nowUtc, officeTzOffsetMinutes } = useSchedulingWorkspace();

  const [surface, setSurface] = useState<Surface>('schedule');
  const [scheduleView, setScheduleView] = useState<ScheduleView>('board');
  const [searchTerm, setSearchTerm] = useState('');
  const [tailFilter, setTailFilter] = useState<Set<string>>(new Set());
  const [tripTypeFilter, setTripTypeFilter] = useState<Set<TripType>>(new Set());
  const [actionRequiredOnly, setActionRequiredOnly] = useState(false);
  const [horizonDays, setHorizonDays] = useState(30);
  const [funnelFilters, setFunnelFilters] = useState<Set<FunnelFilter>>(new Set());
  const [drawer, setDrawer] = useState<{ tripId: string; taskId?: string } | null>(null);
  const [newTripOpen, setNewTripOpen] = useState(false);

  const [trips, setTrips] = useState<BoardTrip[]>([]);
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
      if (!cancelled) setTrips(board);
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

  const runModel = useMemo(
    () => buildRunBoard(filteredTrips, officeTasks, nowMs, horizonDays),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredTrips, officeTasks, horizonDays],
  );

  const upcomingModel = useMemo(
    () => buildUpcomingBoard(filteredTrips, nowMs, horizonDays),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredTrips, horizonDays],
  );

  const openTrip = (tripId: string, taskId?: string) => setDrawer({ tripId, taskId });
  const onTaskAction = async (task: RunTask, action: TaskAction) => {
    try {
      await service.applyAction(task.key, action, userRole, nowUtc());
      bump();
    } catch (err) {
      toast.error(`Couldn't ${action.kind} task: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  };
  const toggleTail = (tail: string) =>
    setTailFilter(prev => { const s = new Set(prev); s.has(tail) ? s.delete(tail) : s.add(tail); return s; });
  const toggleTripType = (t: TripType) =>
    setTripTypeFilter(prev => { const s = new Set(prev); s.has(t) ? s.delete(t) : s.add(t); return s; });
  const toggleFunnel = (f: FunnelFilter) =>
    setFunnelFilters(prev => { const s = new Set(prev); s.has(f) ? s.delete(f) : s.add(f); return s; });

  if (!ready) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const showsFilterBar = surface === 'schedule' || surface === 'upcoming' || surface === 'action';

  return (
    <div className="space-y-4">
      {/* Page header — standard GFO chrome */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Scheduling</h1>
          <p className="text-sm text-muted-foreground">
            {trips.length} trips · readiness derived live from checklist state
          </p>
        </div>
        <Button onClick={() => setNewTripOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> New trip
        </Button>
      </div>

      {/* Surfaces: two primary + quiet utilities */}
      <div className="flex flex-wrap items-center gap-3 border-b pb-px">
        <Tabs value={surface === 'schedule' || surface === 'upcoming' || surface === 'action' ? surface : ''} className="w-auto">
          <TabsList>
            <TabsTrigger value="schedule" onClick={() => setSurface('schedule')}>
              <Rows3 className="h-4 w-4 mr-1.5" /> Schedule
            </TabsTrigger>
            <TabsTrigger value="upcoming" onClick={() => setSurface('upcoming')}>
              <CalendarClock className="h-4 w-4 mr-1.5" /> Upcoming
            </TabsTrigger>
            <TabsTrigger value="action" onClick={() => setSurface('action')}>
              <ListChecks className="h-4 w-4 mr-1.5" /> Action Center
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {surface === 'schedule' && (
          <div className="flex bg-muted rounded-lg p-0.5 gap-0.5">
            {([['board', Rows3, 'Board'], ['calendar', CalendarDays, 'Calendar'], ['list', LayoutList, 'List']] as const).map(([v, Icon, label]) => (
              <button key={v} onClick={() => setScheduleView(v)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${scheduleView === v ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1 ml-auto">
          {UTILITY_TABS.map(({ key, label, icon: Icon }) => (
            <Button
              key={key}
              variant={surface === key ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setSurface(key)}
              className="text-muted-foreground data-[active]:text-foreground"
            >
              <Icon className="h-4 w-4 mr-1.5" /> {label}
            </Button>
          ))}
        </div>
      </div>

      {showsFilterBar && (
        <FilterBar
          fleet={fleetRowsFor(trips)}
          searchTerm={searchTerm} onSearch={setSearchTerm}
          tailFilter={tailFilter} onToggleTail={toggleTail}
          tripTypeFilter={tripTypeFilter} onToggleTripType={toggleTripType}
          actionRequiredOnly={actionRequiredOnly} onActionRequired={setActionRequiredOnly}
          horizonDays={horizonDays} onHorizon={setHorizonDays}
        />
      )}

      {/* Active surface */}
      {surface === 'schedule' && scheduleView === 'board' && (
        <PlanBoard trips={filteredTrips} nowMs={nowMs} serviceability={fleetServiceability} onTripClick={t => openTrip(t.id)} />
      )}
      {surface === 'schedule' && scheduleView === 'calendar' && (
        <CalendarView trips={filteredTrips} nowMs={nowMs} onTripClick={t => openTrip(t.id)} />
      )}
      {surface === 'schedule' && scheduleView === 'list' && (
        <DispatchTable trips={filteredTrips} nowMs={nowMs} onTripClick={t => openTrip(t.id)} />
      )}
      {surface === 'upcoming' && (
        <UpcomingLanes model={upcomingModel} onOpenTrip={openTrip} />
      )}
      {surface === 'action' && (
        <RunBoard
          model={runModel} trips={filteredTrips}
          funnelFilters={funnelFilters} onToggleFunnel={toggleFunnel}
          onAction={onTaskAction} onOpenTrip={openTrip}
        />
      )}
      {surface === 'templates' && <TemplatesPanel userRole={userRole} additionalRoles={additionalRoles} />}
      {surface === 'inbox' && <InboxPanel defaultTargetRole="pilot" />}
      {surface === 'foreflight' && <ForeFlightPanel />}

      {/* The trip workspace, over whichever view you're in */}
      <TripDrawer
        tripId={drawer?.tripId ?? null}
        focusTaskId={drawer?.taskId}
        open={!!drawer}
        onOpenChange={o => { if (!o) setDrawer(null); }}
        userRole={userRole}
      />

      <NewTripDialog
        open={newTripOpen}
        onOpenChange={setNewTripOpen}
        userRole={userRole}
        onCreated={tripId => openTrip(tripId)}
      />
    </div>
  );
}
