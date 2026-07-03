import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Activity, Calendar, LayoutDashboard, List, Rows3, Plane, ClipboardList, Inbox as InboxIcon, Send, Loader2 } from 'lucide-react';
import { useSchedulingWorkspace } from '../scheduling-workspace/SchedulingWorkspaceContext';
import TripsPanel from '../scheduling-workspace/TripsPanel';
import TemplatesPanel from '../scheduling-workspace/TemplatesPanel';
import InboxPanel from '../scheduling-workspace/InboxPanel';
import ForeFlightPanel from '../scheduling-workspace/ForeFlightPanel';
import type { TaskAction } from '../../scheduling/engine/tasks';
import { boardTripOf, toBoardTask, type BoardTrip, type BoardTask } from './adapter';
import { fleetRowsFor } from './fleet';
import { deriveTripStatus } from './tripStatus';
import { PlanBoard } from './PlanBoard';
import { RunBoard, type FunnelFilter } from './RunBoard';
import { CalendarView } from './CalendarView';
import { DispatchTable } from './DispatchTable';
import { FilterBar } from './FilterBar';
import { buildRunBoard, type RunTask } from './runBoardSelectors';

type ViewTab = 'plan' | 'run' | 'calendar' | 'table' | 'trips' | 'templates' | 'inbox' | 'foreflight';

const BOARD_TABS: { key: ViewTab; label: string; icon: React.ElementType }[] = [
  { key: 'plan', label: 'Plan Board', icon: Rows3 },
  { key: 'run', label: 'Run Board', icon: LayoutDashboard },
  { key: 'calendar', label: 'Calendar', icon: Calendar },
  { key: 'table', label: 'Table', icon: List },
];
const OPS_TABS: { key: ViewTab; label: string; icon: React.ElementType }[] = [
  { key: 'trips', label: 'Trips', icon: Plane },
  { key: 'templates', label: 'Templates', icon: ClipboardList },
  { key: 'inbox', label: 'Inbox', icon: InboxIcon },
  { key: 'foreflight', label: 'ForeFlight', icon: Send },
];

/**
 * THE scheduling hub — the scheduler's front door. Four board views + the operational panels
 * (Trips incl. create/mirror + preflight release, Templates no-code editor, cross-role Inbox,
 * ForeFlight push), all on the production scheduling store/engine: real TripRecords, real
 * TaskInstances, engine-derived readiness. Replaces the old /scheduling-workspace tab page.
 */
export default function SchedulingCommandCenter({
  userRole = 'scheduling',
  additionalRoles = [],
}: {
  userRole?: string;
  additionalRoles?: string[];
}) {
  const { service, store, ready, tick, bump, nowUtc, officeTzOffsetMinutes } = useSchedulingWorkspace();

  const [tab, setTab] = useState<ViewTab>('plan');
  const [searchTerm, setSearchTerm] = useState('');
  const [tailFilter, setTailFilter] = useState<Set<string>>(new Set());
  const [actionRequiredOnly, setActionRequiredOnly] = useState(false);
  const [horizonDays, setHorizonDays] = useState(30);
  const [funnelFilters, setFunnelFilters] = useState<Set<FunnelFilter>>(new Set());
  const [focusTrip, setFocusTrip] = useState<{ id: string; n: number } | null>(null);

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

  const filteredTrips = useMemo(() => trips.filter(t => {
    if (tailFilter.size > 0 && !tailFilter.has(t.aircraft)) return false;
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
  }), [trips, tailFilter, actionRequiredOnly, searchTerm]);

  const runModel = useMemo(
    () => buildRunBoard(filteredTrips, officeTasks, nowMs, horizonDays),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredTrips, officeTasks, horizonDays],
  );

  const openTrip = (trip: BoardTrip) => { setFocusTrip(f => ({ id: trip.id, n: (f?.n ?? 0) + 1 })); setTab('trips'); };
  const openTask = (task: RunTask) => {
    if (task.tripId) { setFocusTrip(f => ({ id: task.tripId!, n: (f?.n ?? 0) + 1 })); setTab('trips'); }
  };
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
  const toggleFunnel = (f: FunnelFilter) =>
    setFunnelFilters(prev => { const s = new Set(prev); s.has(f) ? s.delete(f) : s.add(f); return s; });

  const isBoardTab = tab === 'plan' || tab === 'run' || tab === 'calendar' || tab === 'table';

  const tabButton = ({ key, label, icon: Icon }: { key: ViewTab; label: string; icon: React.ElementType }) => (
    <button
      key={key}
      onClick={() => setTab(key)}
      className={`flex items-center gap-2 px-3.5 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${tab === key ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-white'}`}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );

  if (!ready) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-slate-50 -m-6">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-slate-50 -m-6 font-sans">
      {/* Header */}
      <header className="min-h-24 bg-slate-950 text-white flex flex-wrap items-center justify-between gap-4 px-10 py-4 shadow-lg relative z-20 shrink-0">
        <div>
          <h1 className="text-3xl font-black tracking-tighter flex items-center gap-4">
            <Activity className="h-8 w-8 text-blue-500" />
            MASTER SCHEDULING COMMAND
          </h1>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {trips.length} trips · live task engine
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1">
            {BOARD_TABS.map(tabButton)}
          </div>
          <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1">
            {OPS_TABS.map(tabButton)}
          </div>
        </div>
      </header>

      {isBoardTab && (
        <FilterBar
          fleet={fleetRowsFor(trips)}
          searchTerm={searchTerm} onSearch={setSearchTerm}
          tailFilter={tailFilter} onToggleTail={toggleTail}
          actionRequiredOnly={actionRequiredOnly} onActionRequired={setActionRequiredOnly}
          horizonDays={horizonDays} onHorizon={setHorizonDays}
        />
      )}

      <main className="flex-1 overflow-auto p-10 flex flex-col gap-10">
        <div className="animate-in fade-in zoom-in-95 duration-300 flex flex-col gap-10">
          {tab === 'plan' && <PlanBoard trips={filteredTrips} nowMs={nowMs} onTripClick={openTrip} />}
          {tab === 'run' && (
            <RunBoard
              model={runModel} trips={filteredTrips}
              funnelFilters={funnelFilters} onToggleFunnel={toggleFunnel}
              onAction={onTaskAction} onRowClick={openTask}
            />
          )}
          {tab === 'calendar' && <CalendarView trips={filteredTrips} nowMs={nowMs} onTripClick={openTrip} />}
          {tab === 'table' && <DispatchTable trips={filteredTrips} nowMs={nowMs} onTripClick={openTrip} />}
          {tab === 'trips' && <TripsPanel userRole={userRole} focusTrip={focusTrip} />}
          {tab === 'templates' && <TemplatesPanel userRole={userRole} additionalRoles={additionalRoles} />}
          {tab === 'inbox' && <InboxPanel defaultTargetRole="pilot" />}
          {tab === 'foreflight' && <ForeFlightPanel />}
        </div>
      </main>
    </div>
  );
}
