import React, { useEffect, useMemo, useState } from 'react';
import { useSchedulingWorkspace } from '../scheduling-workspace/SchedulingWorkspaceContext';
import { useTechLog } from '../tech-log/TechLogContext';
import { deriveTripReadiness } from '../tech-log/engine/readiness';
import { deriveSchedulingReadiness } from '../../scheduling/engine/readiness';
import { selectPilotFlights, composePilotReadiness, type PilotReadiness } from './selectors';
import { groupTripsByHorizon, tripNeedsPrep, type HorizonGroups } from './myFlights';
import { deriveTripModules } from './moduleStatus';
import { TripGlanceStrip } from './panels/TripGlanceStrip';
import { matchesTripTypeFilter } from '../scheduling-command/tripFilters';
import type { TripRecord } from '../../scheduling/store/types';
import type { TripType } from '../../scheduling/engine/types';

const TRIP_TYPE_OPTIONS: [TripType, string][] = [
  ['domestic', 'Domestic'],
  ['international', "Int'l"],
  ['dca_dassp', 'DASSP'],
];

// Readiness dot: green = ready, red = grounded/blocked (airworthiness stop). NOT_READY (routine prep
// in progress) is neutral — amber stays reserved for a genuinely AMBER aircraft, shown in the card.
const DOT: Record<PilotReadiness['state'], string> = {
  READY: 'bg-emerald-500',
  NOT_READY: 'bg-muted-foreground',
  BLOCKED: 'bg-red-500',
};

const BANDS: [keyof Omit<HorizonGroups, 'inProgress'>, string][] = [
  ['thisWeek', 'This week'],
  ['next2Weeks', 'Next 2 weeks'],
  ['laterThisMonth', 'Later this month'],
  ['nextMonth', 'Next month'],
];

const chipClass = (active: boolean) =>
  `px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${
    active
      ? 'bg-foreground text-background border-foreground'
      : 'bg-background text-muted-foreground border-border hover:text-foreground hover:bg-accent'
  }`;

export default function MyFlightsPanel({
  onOpen,
  selectedTripId,
  collapsed = false,
}: {
  onOpen: (trip: TripRecord) => void;
  /** The trip open in the detail pane, so the list can show where you are (D84 split view). */
  selectedTripId?: string;
  /** Tail-strip presentation: 72pt of tails, no filters, no glance strips. */
  collapsed?: boolean;
}) {
  const { store, tick, nowUtc } = useSchedulingWorkspace();
  const { state } = useTechLog();
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [readiness, setReadiness] = useState<Record<string, PilotReadiness>>({});
  const [typeFilter, setTypeFilter] = useState<Set<TripType>>(new Set());
  const [needsPrepOnly, setNeedsPrepOnly] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const all = await store.listTrips();
      const mine = selectPilotFlights(all, nowUtc());
      if (cancelled) return;
      setTrips(mine);
      const now = nowUtc();
      const entries = await Promise.all(mine.map(async (t) => {
        const sched = deriveSchedulingReadiness(await store.listInstancesForTrip(t.id));
        const tlTrip = state.trips.find((x) => x.tripNumber === t.tripNumber) ?? null;
        const pf = tlTrip ? deriveTripReadiness(tlTrip, state, now) : null;
        return [t.id, composePilotReadiness(sched, pf)] as const;
      }));
      if (!cancelled) setReadiness(Object.fromEntries(entries));
    })();
    return () => { cancelled = true; };
  }, [store, tick, state, nowUtc]);

  // "Needs prep" is synchronous from the tech-log mirror + aircraft (no store round-trip).
  const needsPrepById = useMemo(() => {
    const out: Record<string, boolean> = {};
    for (const t of trips) {
      const tlTrip = state.trips.find((x) => x.tripNumber === t.tripNumber) ?? null;
      const ac = tlTrip ? state.aircraft.find((a) => a.id === tlTrip.aircraftId) : undefined;
      out[t.id] = tripNeedsPrep(tlTrip, ac);
    }
    return out;
  }, [trips, state]);

  const groups = useMemo(() => {
    const filtered = trips.filter(
      (t) => matchesTripTypeFilter(t.tripType, typeFilter) && (!needsPrepOnly || needsPrepById[t.id]),
    );
    return groupTripsByHorizon(filtered, nowUtc());
  }, [trips, typeFilter, needsPrepOnly, needsPrepById, nowUtc]);

  const toggleType = (t: TripType) =>
    setTypeFilter((prev) => { const s = new Set(prev); s.has(t) ? s.delete(t) : s.add(t); return s; });

  const total = groups.inProgress.length + BANDS.reduce((n, [k]) => n + groups[k].length, 0);

  const card = (t: TripRecord, pinned = false) => {
    const r = readiness[t.id];
    const selected = t.id === selectedTripId;
    const tlTrip = state.trips.find((x) => x.tripNumber === t.tripNumber) ?? null;
    const ac = tlTrip ? state.aircraft.find((a) => a.id === tlTrip.aircraftId) : state.aircraft.find((a) => a.tailNumber === t.tail);
    const modules = deriveTripModules(tlTrip, ac, state, r?.scheduling, nowUtc());
    const dep = t.legs?.[0];
    const badge = t.tripType === 'international' ? "Int'l" : t.tripType === 'dca_dassp' ? 'DASSP' : null;
    return (
      <button key={t.id} onClick={() => onOpen(t)} aria-current={selected ? 'true' : undefined}
        className={`w-full text-left rounded-lg border p-3 hover:bg-accent duration-fast ${
          selected ? 'border-primary bg-secondary' : pinned ? 'border-primary bg-accent/40' : ''
        }`}>
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 font-semibold">
            {r && <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT[r.state]}`} aria-hidden />}
            {t.tripNumber} · {t.tail}
          </span>
          <span className="flex shrink-0 items-center gap-1.5">
            {badge && (
              <span className="text-[10px] font-medium uppercase tracking-wide rounded border px-1.5 py-0.5 text-muted-foreground">{badge}</span>
            )}
            {needsPrepById[t.id] && (
              <span className="text-[10px] font-medium uppercase tracking-wide rounded-full border border-border bg-background px-2 py-0.5 text-foreground">
                Needs prep
              </span>
            )}
          </span>
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          {dep ? `${dep.departureIcao} → ${t.legs[t.legs.length - 1].arrivalIcao} · ${dep.departureTimeUtc.slice(0, 16).replace('T', ' ')}Z` : 'No legs'}
        </div>
        <div className="mt-2"><TripGlanceStrip modules={modules} /></div>
      </button>
    );
  };

  // Collapsed: the column is a 72pt tail strip. Every flight is still one tap away — the point of
  // collapsing is to hand the screen to the work, not to hide where else you have to be.
  if (collapsed) {
    const all = [...groups.inProgress, ...BANDS.flatMap(([k]) => groups[k])];
    return (
      <div className="flex flex-col items-center gap-1.5 p-2">
        {all.map((t) => {
          const r = readiness[t.id];
          const dep = t.legs?.[0];
          return (
            <button key={t.id} onClick={() => onOpen(t)} aria-current={t.id === selectedTripId ? 'true' : undefined}
              title={`${t.tripNumber} · ${t.tail}`}
              className={`flex w-14 flex-col items-center gap-0.5 rounded-lg border p-2 hover:bg-accent duration-fast ${
                t.id === selectedTripId ? 'border-primary bg-secondary' : 'border-border'
              }`}>
              {r && <span className={`h-2 w-2 shrink-0 rounded-full ${DOT[r.state]}`} aria-hidden />}
              <span className="text-[12px] font-semibold leading-tight tracking-tight">{t.tail}</span>
              <span className="text-[9px] leading-tight text-muted-foreground">
                {dep ? dep.departureTimeUtc.slice(5, 10).replace('-', '/') : '—'}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4 p-3">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {TRIP_TYPE_OPTIONS.map(([value, label]) => (
            <button key={value} onClick={() => toggleType(value)} className={chipClass(typeFilter.has(value))}>
              {label}
            </button>
          ))}
        </div>
        <button onClick={() => setNeedsPrepOnly((v) => !v)} className={chipClass(needsPrepOnly)}>
          Needs prep only
        </button>
      </div>

      {total === 0 && (
        <p className="text-muted-foreground text-sm">
          {needsPrepOnly ? 'Nothing needs your prep right now.' : 'No flights match this filter.'}
        </p>
      )}

      {groups.inProgress.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">In progress</h2>
          {groups.inProgress.map((t) => card(t, true))}
        </section>
      )}

      {BANDS.map(([key, label]) =>
        groups[key].length > 0 ? (
          <section key={key} className="space-y-2">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</h2>
            {groups[key].map((t) => card(t))}
          </section>
        ) : null,
      )}
    </div>
  );
}
