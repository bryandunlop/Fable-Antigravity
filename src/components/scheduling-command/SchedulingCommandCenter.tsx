import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { CalendarCheck, ClipboardList, Eye, Inbox as InboxIcon, ListChecks, Loader2, Rows3, Send, Telescope, Tv } from 'lucide-react';
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
import { AttentionBand } from './AttentionBand';
import { toTripsForAlerts } from './alertTrips';
import { fleetRowsFor } from './fleet';
import { PlanBoard } from './PlanBoard';
import { FilterBar } from './FilterBar';
import { DockedTripDrawer } from './DockedTripDrawer';
import { QueueView } from './QueueView';
import { recallLens, rememberLens, type HomeLens } from './lensMemory';
import { loadTrips, saveTrips, TRIPS_CHANGED_EVENT } from '../trips/data/tripsStore';
import { loadSettings } from '../trips/data/settingsStore';
import { loadLinkedRegister } from '../trips/data/peopleStore';
import { withFlownDerived } from '../trips/engine/people';
import { boardMarksFor, markLabels, crewLabel, unassignedBookings } from '../trips/engine/boardMarks';
import { legClock } from '../trips/engine/legClock';
import { routeLabel, tripSpan, type Trip } from '../trips/engine/trip';
import { buildHorizonBoard, officeTasksDueToday } from './horizonSelectors';
import { AvailabilityBoard } from './AvailabilityBoard';
import { actingUser } from '../safety-center/actingUser';
import { appendOverlay, loadAvailabilityData, readFleetAvailability, readReleaseSuggestions, saveDowntimeBlock } from '../../availability/source';
import type { TripRecord } from '../../scheduling/store/types';
import { HorizonView } from './HorizonView';
import { matchesTripTypeFilter, hasOpenWork, filterCounts } from './tripFilters';
import type { TripType } from '../../scheduling/engine';

// One home, three lenses (D110 slice 3, canvas C): Board (the picture schedulers think in — the
// default), Horizon (the same trips by when work is due) and Queue (by who is waiting) are
// PROJECTIONS of the same filtered bookings under one filter row. The last lens is remembered per
// person. Calendar and List retired with D110; Availability (LG-311) — the one surface that manages
// what is NOT committed — moved beside Templates as a utility.
type Lens = HomeLens;
type Utility = 'availability' | 'templates' | 'inbox' | 'foreflight' | 'pilot-visibility';

const LENSES: { key: Lens; label: string; icon: React.ElementType }[] = [
  { key: 'board', label: 'Board', icon: Rows3 },
  { key: 'horizon', label: 'Horizon', icon: Telescope },
  { key: 'queue', label: 'Queue', icon: ListChecks },
];

const UTILITY_TABS: { key: Utility; label: string; icon: React.ElementType }[] = [
  { key: 'availability', label: 'Availability', icon: CalendarCheck },
  { key: 'templates', label: 'Templates', icon: ClipboardList },
  { key: 'inbox', label: 'Inbox', icon: InboxIcon },
  { key: 'foreflight', label: 'ForeFlight', icon: Send },
  { key: 'pilot-visibility', label: 'Pilot visibility', icon: Eye },
];

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

  const person = useMemo(() => actingUser(userRole).name, [userRole]);
  const [lens, setLensState] = useState<Lens>(() => recallLens(person, typeof localStorage === 'undefined' ? null : localStorage));
  const setLens = (l: Lens) => { setLensState(l); rememberLens(person, l, typeof localStorage === 'undefined' ? null : localStorage); };

  // The bookings themselves (D110): the board's marks, crew row and Unassigned lane, and the Queue
  // lens, read the trips module directly — the scheduling store holds their projection, not their
  // people, gates or change requests. Re-read whenever the module writes.
  const [bookingsTick, setBookingsTick] = useState(0);
  useEffect(() => {
    const on = () => setBookingsTick(t => t + 1);
    window.addEventListener(TRIPS_CHANGED_EVENT, on);
    window.addEventListener('storage', on);
    return () => { window.removeEventListener(TRIPS_CHANGED_EVENT, on); window.removeEventListener('storage', on); };
  }, []);
  const bookings = useMemo(() => {
    const s = loadSettings();
    const linked = loadLinkedRegister<Trip>(loadTrips, saveTrips, s.passengerPrefs, s.principalReserve?.name, new Date().toISOString());
    const people = withFlownDerived(linked.people, linked.trips, new Date().toISOString());
    return { trips: linked.trips.filter(t => t.visibleToScheduling), people, settings: s };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingsTick, tick]);
  const bookingIds = useMemo(() => new Set(bookings.trips.map(t => t.id)), [bookings]);
  const [utility, setUtility] = useState<Utility | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [tailFilter, setTailFilter] = useState<Set<string>>(new Set());
  const [tripTypeFilter, setTripTypeFilter] = useState<Set<TripType>>(new Set());
  const [hideCleared, setHideCleared] = useState(false);
  const [horizonDays, setHorizonDays] = useState(30);
  const [drawer, setDrawer] = useState<{ tripId: string; taskId?: string } | null>(null);

  const [trips, setTrips] = useState<BoardTrip[]>([]);
  const [alertTrips, setAlertTrips] = useState<TripForAlerts[]>([]);
  const [officeTasks, setOfficeTasks] = useState<BoardTask[]>([]);
  const generatedRunBoard = useRef(false);

  const nowMs = Date.now();

  // ── Availability lens (LG-311) ──
  // Release authority is scheduling's (Bryan, 2026-08-31); lead and admin read the board without
  // the controls. The raw fleet is used here rather than a disclosed view because this IS the
  // operator surface — it renders the full ranked reason stack, and shows the executive's view of
  // each cell alongside it so whoever writes a public label can see what it produces.
  const availabilityActor = useMemo(() => {
    const { name } = actingUser(userRole);
    return { name, role: userRole };
  }, [userRole]);
  const canManageAvailability = useMemo(
    () => [userRole, ...additionalRoles].some(r => r === 'scheduling' || r === 'admin'),
    [userRole, additionalRoles],
  );
  const availabilityNow = nowUtc();
  const [rawTrips, setRawTrips] = useState<TripRecord[]>([]);
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    store.listTrips().then(rows => { if (!cancelled) setRawTrips(rows); });
    return () => { cancelled = true; };
  }, [store, ready, tick]);
  const availability = useMemo(
    () => readFleetAvailability({ trips: rawTrips }, availabilityNow, 14),
    [rawTrips, availabilityNow],
  );
  const downtimeBlocks = useMemo(
    () => loadAvailabilityData(availabilityNow).downtimeBlocks,
    [availabilityNow, tick],
  );
  const releaseSuggestions = useMemo(
    () => readReleaseSuggestions({ trips: rawTrips }, availabilityNow, 14),
    [rawTrips, availabilityNow],
  );

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
    if (hideCleared && !hasOpenWork(t)) return false; // work-ahead: hide only fully-cleared trips
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      if (!t.tripNumber.toLowerCase().includes(s) && !t.client.toLowerCase().includes(s) &&
          !t.aircraft.toLowerCase().includes(s) && !t.route.toLowerCase().includes(s)) return false;
    }
    return true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [trips, tailFilter, tripTypeFilter, hideCleared, searchTerm]);

  const counts = useMemo(() => filterCounts(trips), [trips]);

  const boardMarks = useMemo(() => {
    const m = boardMarksFor(bookings.trips, bookings.people, bookings.settings.documentPolicy, nowUtc());
    const out = new Map<string, { labels: string[]; crewLabel: string | null; crewMissing: boolean }>();
    for (const [id, bm] of m) out.set(id, { labels: markLabels(bm), crewLabel: crewLabel(bm.crew), crewMissing: bm.crewMissing });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings]);
  const unassigned = useMemo(() => unassignedBookings(bookings.trips).map(t => {
    const span = tripSpan(t);
    const first = t.legs.map(l => legClock(l)?.depUtc).find((d): d is string => !!d);
    const days = span.start && span.end ? Math.max(1, Math.round((Date.parse(span.end) - Date.parse(span.start)) / 86_400_000) + 1) : 1;
    return { id: t.id, title: t.title, route: routeLabel(t), departureDate: first ?? (span.start ? `${span.start}T12:00:00.000Z` : nowUtc()), durationDays: days };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }).filter(u => tailFilter.size === 0), [bookings, tailFilter]);

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
            {trips.length} trips · bookings and the myairops feed · readiness derived live from checklist state
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

      {/* Persists across every lens: ONE attention band — aircraft RAG | task urgency, expandable. */}
      {onLensSurface && <AttentionBand alerts={opsAlerts} overdue={horizonModel.overdue} onOpenTrip={openTrip} />}

      {onLensSurface && (
        <FilterBar
          fleet={fleetRowsFor(trips)} counts={counts}
          searchTerm={searchTerm} onSearch={setSearchTerm}
          tailFilter={tailFilter} onToggleTail={toggleTail}
          tripTypeFilter={tripTypeFilter} onToggleTripType={toggleTripType}
          hideCleared={hideCleared} onHideCleared={setHideCleared}
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
        <PlanBoard
          trips={filteredTrips} nowMs={nowMs} serviceability={fleetServiceability} downtime={downtimeBlocks}
          marks={boardMarks} unassigned={unassigned} onOpenBooking={id => openTrip(id)}
          onTripClick={t => openTrip(t.id)} onOpenHorizon={() => setLens('horizon')}
        />
      )}
      {onLensSurface && lens === 'queue' && (
        <QueueView trips={bookings.trips} people={bookings.people} settings={bookings.settings} nowUtc={nowUtc()} tailFilter={tailFilter} onOpenTrip={id => openTrip(id)} />
      )}
      {utility === 'availability' && (
        <AvailabilityBoard
          fleet={availability}
          serviceability={fleetServiceability}
          nowUtc={availabilityNow}
          suggestions={releaseSuggestions}
          actor={availabilityActor}
          canManage={canManageAvailability}
          onSaveBlock={block => { saveDowntimeBlock(block, availabilityNow); bump(); }}
          onAppendOverlay={overlay => { appendOverlay(overlay, availabilityNow); bump(); }}
        />
      )}
      {utility === 'templates' && <TemplatesPanel userRole={userRole} additionalRoles={additionalRoles} />}
      {utility === 'inbox' && <InboxPanel defaultTargetRole="pilot" />}
      {utility === 'foreflight' && <ForeFlightPanel />}
      {utility === 'pilot-visibility' && <PilotVisibilityPanel />}

      {/* The trip workspace, over whichever lens you're in */}
      <DockedTripDrawer
        tripId={drawer?.tripId ?? null}
        isBooking={!!drawer && bookingIds.has(drawer.tripId)}
        focusTaskId={drawer?.taskId}
        open={!!drawer}
        onOpenChange={o => { if (!o) setDrawer(null); }}
        userRole={userRole}
        additionalRoles={additionalRoles}
      />
    </div>
  );
}
