import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useSchedulingWorkspace } from '../scheduling-workspace/SchedulingWorkspaceContext';
import { boardTripOf, type BoardTrip } from './adapter';
import { readFleetAirworthiness, readTripServiceabilityAlerts, type TripForAlerts } from '../tech-log/bridge';
import { toTripsForAlerts } from './alertTrips';
import { groupAlertsByAircraft } from './alertGroups';
import { fleetRowsFor } from './fleet';
import { buildWallModel } from './wallSelectors';
import type { TripDerivedStatus } from './tripStatus';

// Wall status vocabulary: same derivation as everywhere else, restyled for a dark room-distance
// read. RED/AMBER/GREEN on the fleet strip IS aircraft RAG semantics (never brand accents).
const WALL_STATUS: Record<TripDerivedStatus, { label: string; color: string }> = {
  blocked: { label: 'BLOCKED', color: '#EF3340' },
  behind: { label: 'BEHIND', color: '#F1B434' },
  attention: { label: 'ATTENTION', color: '#F1B434' },
  airborne: { label: 'AIRBORNE', color: '#7FCCFE' },
  ready: { label: 'READY', color: '#00B140' },
  'on-track': { label: 'ON TRACK', color: '#7FCCFE' },
  uninteracted: { label: 'UNTOUCHED', color: '#B9C2E0' },
};

// NOT_ASSESSED is neutral grey, never a RAG colour: a tail whose D195 MEL is unapproved has no
// dispatch state, and painting it green or amber would assert one it does not have.
const RAG_COLOR = { GREEN: '#00B140', AMBER: '#F1B434', RED: '#EF3340', NOT_ASSESSED: '#8A8A8A' } as const;
const DAY_MS = 86400000;

function useWallClock(): { time: string; date: string } {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return {
    time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/New_York' }),
    date: now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
  };
}

const fmtDow = (iso: string) => new Date(iso).toLocaleDateString('en-US', { weekday: 'short' });
const fmtDay = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/**
 * The scheduling wall (D87) — a READ-ONLY, distance-tuned view for a TV in the ops area. Fleet
 * health, the next departures, and what needs a human — deliberately no controls: nobody works
 * from the wall, so urgency-ranked ordering here doesn't violate the work-ahead steer the
 * Horizon lens is built around. Fixed dark GFO palette regardless of app theme (it's a TV).
 * Data is fresh-on-sync like the rest of Phase 1; the clock ticks locally.
 */
export default function SchedulingWall() {
  const { store, ready, tick, nowUtc } = useSchedulingWorkspace();
  const clock = useWallClock();

  const [trips, setTrips] = useState<BoardTrip[]>([]);
  const [alertTrips, setAlertTrips] = useState<TripForAlerts[]>([]);

  const nowMs = Date.now();

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      const rows = await store.listTrips();
      const board = await Promise.all(rows.map(async t => boardTripOf(t, await store.listInstancesForTrip(t.id))));
      if (!cancelled) {
        setTrips(board);
        setAlertTrips(toTripsForAlerts(rows));
      }
    })();
    return () => { cancelled = true; };
  }, [store, ready, tick]);

  const fleet = useMemo(() => readFleetAirworthiness(nowUtc()), [nowUtc, tick]);
  const alertGroups = useMemo(
    () => groupAlertsByAircraft(readTripServiceabilityAlerts(alertTrips, nowUtc())),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [alertTrips, nowUtc, tick],
  );
  const model = useMemo(() => buildWallModel(trips, nowMs), [trips, nowMs]); // eslint-disable-line react-hooks/exhaustive-deps

  // Per-tail context line: airborne trip, else next departure.
  const tailLine = (tail: string): string => {
    const now = nowMs;
    const airborne = trips.find(t => {
      if (t.aircraft !== tail) return false;
      const dep = new Date(t.departureDate).getTime();
      return dep <= now && now < dep + t.durationDays * DAY_MS;
    });
    if (airborne) return `Airborne — ${airborne.tripNumber} · ${airborne.route}`;
    const next = trips
      .filter(t => t.aircraft === tail && new Date(t.departureDate).getTime() > now)
      .sort((a, b) => a.departureDate.localeCompare(b.departureDate))[0];
    return next ? `Next: ${fmtDow(next.departureDate)} ${fmtDay(next.departureDate)} · ${next.route}` : 'No trips scheduled';
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#0D1F5C] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white/50" />
      </div>
    );
  }

  const attentionTotal = alertGroups.length + model.attention.length;
  const attentionShown = [...alertGroups.map(g => ({
    key: `svc-${g.tail}`,
    chip: g.severity === 'red' ? 'GROUNDING' : 'CAUTION',
    chipColor: g.severity === 'red' ? '#EF3340' : '#F1B434',
    title: `${g.tail} ${g.headline}`,
    detail: `${g.trips.length} trip${g.trips.length === 1 ? '' : 's'} affected through ${fmtDay(g.lastEtdUtc)}`,
  })), ...model.attention.map(r => ({
    key: `${r.kind}-${r.tripId}`,
    chip: r.kind === 'blocked' ? 'BLOCKED' : 'OVERDUE',
    chipColor: '#EF3340',
    title: r.title,
    detail: r.detail,
  }))].slice(0, 6);

  return (
    <div className="min-h-screen bg-[#0D1F5C] text-white px-10 py-8 flex flex-col gap-6" style={{ fontFamily: "'Montserrat', Arial, system-ui, sans-serif" }}>
      {/* Header — readable from across the room */}
      <div className="flex items-baseline gap-5">
        <h1 className="text-3xl font-semibold tracking-tight">GFO Scheduling</h1>
        <span className="text-lg text-[#B9C2E0]">
          {model.totalTrips} trips in play
        </span>
        <div className="ml-auto flex items-baseline gap-4">
          <span className="text-lg text-[#B9C2E0]">{clock.date}</span>
          <span className="text-4xl font-semibold tabular-nums">{clock.time} <span className="text-lg font-medium text-[#B9C2E0]">ET</span></span>
        </div>
      </div>

      {/* Fleet strip — the room's shared picture of the fleet (aircraft RAG). fleetRowsFor, not
          KNOWN_FLEET: a tail that only exists in trips must still appear on the wall. */}
      <div className="grid grid-cols-4 gap-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        {fleetRowsFor(trips).map(ac => {
          const entry = fleet.find(f => f.tailNumber === ac.tail);
          const status = entry?.status;
          const color = status ? RAG_COLOR[status] : '#B9C2E0';
          const statusLine = !entry ? 'No tech-log record'
            : status === 'RED' ? `Grounded — ${entry.openAffectingDefects} open defect${entry.openAffectingDefects === 1 ? '' : 's'}`
            : status === 'AMBER' ? `Restricted — ${entry.activeDeferrals} active deferral${entry.activeDeferrals === 1 ? '' : 's'}`
            : 'Serviceable';
          return (
            <div key={ac.tail} className="bg-[#142D7E] border border-white/20 rounded p-5">
              <div className="flex items-center gap-3">
                <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ background: status ? color : 'transparent', border: status ? 'none' : '1px solid rgba(255,255,255,0.4)' }} />
                <span className="text-2xl font-bold">{ac.tail}</span>
                <span className="text-base text-[#B9C2E0]">{ac.type}</span>
                {status && <span className="ml-auto text-sm font-bold tracking-widest" style={{ color }}>{status}</span>}
              </div>
              <div className="text-[15px] text-[#B9C2E0] mt-2.5 leading-snug">
                {statusLine}<br />{tailLine(ac.tail)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Departing next + Needs attention */}
      <div className="grid grid-cols-2 gap-5 flex-1 min-h-0">
        <div className="bg-[#142D7E] border border-white/20 rounded p-6 flex flex-col gap-4">
          <div className="text-sm font-semibold uppercase tracking-widest text-[#B9C2E0]">Departing next</div>
          {model.departingNext.map(({ trip, status }) => (
            <div key={trip.id} className="flex items-center gap-5 border-b border-white/15 pb-4 last:border-b-0 last:pb-0">
              <div className="w-24 text-center shrink-0">
                <div className="text-2xl font-bold">{fmtDow(trip.departureDate)}</div>
                <div className="text-base text-[#B9C2E0]">{fmtDay(trip.departureDate)}</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[22px] font-semibold truncate">{trip.aircraft} · {trip.route}</div>
                <div className="text-base text-[#B9C2E0] mt-0.5">
                  {trip.tripNumber} · {trip.client}
                  {status !== 'ready' && status !== 'airborne' ? ` · readiness ${trip.readinessScore}%` : ''}
                </div>
              </div>
              <span className="text-base font-bold tracking-wider shrink-0" style={{ color: WALL_STATUS[status].color }}>
                {WALL_STATUS[status].label}
              </span>
            </div>
          ))}
          {model.departingNext.length === 0 && <div className="text-lg text-[#B9C2E0]">No departures scheduled.</div>}
        </div>

        <div className="bg-[#142D7E] border border-white/20 rounded p-6 flex flex-col gap-4">
          <div className="text-sm font-semibold uppercase tracking-widest text-[#B9C2E0]">Needs attention</div>
          {attentionShown.map(row => (
            <div key={row.key} className="flex items-start gap-4 border-b border-white/15 pb-4 last:border-b-0 last:pb-0">
              <span className="text-xs font-bold tracking-widest rounded-full px-3.5 py-1 shrink-0 mt-0.5"
                style={{ color: row.chipColor, background: `${row.chipColor}2e` }}>
                {row.chip}
              </span>
              <div className="min-w-0">
                <div className="text-[20px] font-semibold leading-snug">{row.title}</div>
                <div className="text-base text-[#B9C2E0] mt-0.5">{row.detail}</div>
              </div>
            </div>
          ))}
          {attentionShown.length === 0 && <div className="text-lg text-[#B9C2E0]">Nothing needs a human right now.</div>}
          {attentionTotal > attentionShown.length && (
            <div className="text-base font-medium text-[#7FCCFE]">+ {attentionTotal - attentionShown.length} more need attention — see Scheduling</div>
          )}
          <div className="mt-auto text-base text-[#B9C2E0]">
            Everything else is on track — {model.quietCount} trip{model.quietCount === 1 ? '' : 's'} need nothing today
          </div>
        </div>
      </div>

      {/* Quiet footer — the only interactive element, for whoever set the TV up */}
      <div className="flex items-center justify-between text-sm text-white/40">
        <span>Read-only · data refreshes on sync · trips arrive from myairops</span>
        <Link to="/scheduling-command" className="hover:text-white/70 transition-colors">Open Scheduling →</Link>
      </div>
    </div>
  );
}
