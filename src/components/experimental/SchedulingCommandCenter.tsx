import { useMemo, useState } from 'react';
import { Activity, Calendar, LayoutDashboard, List, Rows3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SHARED_MOCK_TRIPS, type ChecklistStatus, type MockTripData } from './mockData';
import { deriveTripStatus } from './scheduling/tripStatus';
import { PlanBoard } from './scheduling/PlanBoard';
import { RunBoard, type FunnelFilter } from './scheduling/RunBoard';
import { CalendarView } from './scheduling/CalendarView';
import { DispatchTable } from './scheduling/DispatchTable';
import { FilterBar } from './scheduling/FilterBar';
import { buildRunBoard, type RunTask } from './scheduling/runBoardSelectors';

type ViewTab = 'plan' | 'run' | 'calendar' | 'table';

const TABS: { key: ViewTab; label: string; icon: React.ElementType }[] = [
  { key: 'plan', label: 'Plan Board', icon: Rows3 },
  { key: 'run', label: 'Run Board', icon: LayoutDashboard },
  { key: 'calendar', label: 'Calendar', icon: Calendar },
  { key: 'table', label: 'Table', icon: List },
];

/**
 * Scheduler command center shell: one filter state, four views over the same trips.
 * Plan Board (tail × time) answers "what is each tail doing"; Run Board answers "what needs me
 * now"; Calendar and Table are the original tactical/planning views on the shared status logic.
 */
export default function SchedulingCommandCenter() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<ViewTab>('plan');
  const [searchTerm, setSearchTerm] = useState('');
  const [tailFilter, setTailFilter] = useState<Set<string>>(new Set());
  const [actionRequiredOnly, setActionRequiredOnly] = useState(false);
  const [horizonDays, setHorizonDays] = useState(30);
  const [funnelFilters, setFunnelFilters] = useState<Set<FunnelFilter>>(new Set());
  // Run-board actions are mock-tier local overrides (the workspace holds its copy in local state
  // too); keyed by RunTask.key so readiness/blockers re-derive from the overridden checklist.
  const [itemOverrides, setItemOverrides] = useState<Map<string, ChecklistStatus>>(new Map());

  const nowMs = useMemo(() => Date.now(), []);

  // Apply overrides, then re-derive readiness + blocker from the resulting checklist so every view
  // (bars, pills, %, funnel) reflects run-board actions consistently.
  const trips: MockTripData[] = useMemo(() => SHARED_MOCK_TRIPS.map(t => {
    let touched = false;
    const checklist = t.checklist.map(item => {
      const next = itemOverrides.get(`${t.tripNumber}:${item.id}`);
      if (!next || next === item.status) return item;
      touched = true;
      return { ...item, status: next, lastComment: next === 'blocked' ? item.lastComment ?? 'Issue flagged' : item.lastComment };
    });
    if (!touched) return t;
    const ready = checklist.filter(i => i.status === 'ready').length;
    const firstBlocked = checklist.find(i => i.status === 'blocked');
    return {
      ...t,
      checklist,
      readinessScore: Math.round((ready / checklist.length) * 100),
      criticalBlocker: firstBlocked ? firstBlocked.lastComment ?? 'Blocked item' : undefined,
    };
  }), [itemOverrides]);

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
  }), [trips, tailFilter, actionRequiredOnly, searchTerm, nowMs]);

  const runModel = useMemo(() => buildRunBoard(filteredTrips, nowMs, horizonDays), [filteredTrips, nowMs, horizonDays]);

  const openTrip = (trip: MockTripData) => navigate('/experimental/unified-trip', { state: { tripId: trip.tripNumber } });
  const openTask = (task: RunTask) => navigate('/experimental/unified-trip', { state: { tripId: task.tripNumber, itemId: task.item.id } });
  const onTaskAction = (task: RunTask, next: ChecklistStatus) =>
    setItemOverrides(prev => new Map(prev).set(task.key, next));
  const toggleTail = (tail: string) =>
    setTailFilter(prev => { const s = new Set(prev); s.has(tail) ? s.delete(tail) : s.add(tail); return s; });
  const toggleFunnel = (f: FunnelFilter) =>
    setFunnelFilters(prev => { const s = new Set(prev); s.has(f) ? s.delete(f) : s.add(f); return s; });

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-slate-50 -m-6 font-sans">
      {/* Header */}
      <header className="h-24 bg-slate-950 text-white flex items-center justify-between px-10 shadow-lg relative z-20 shrink-0">
        <div>
          <h1 className="text-3xl font-black tracking-tighter flex items-center gap-4">
            <Activity className="h-8 w-8 text-blue-500" />
            MASTER SCHEDULING COMMAND
          </h1>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            MyAirOps API Sync Active
          </p>
        </div>

        <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${tab === key ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
      </header>

      <FilterBar
        searchTerm={searchTerm} onSearch={setSearchTerm}
        tailFilter={tailFilter} onToggleTail={toggleTail}
        actionRequiredOnly={actionRequiredOnly} onActionRequired={setActionRequiredOnly}
        horizonDays={horizonDays} onHorizon={setHorizonDays}
      />

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
        </div>
      </main>
    </div>
  );
}
