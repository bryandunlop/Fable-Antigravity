import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, AlertTriangle, Globe, MapPin } from 'lucide-react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../ui/hover-card';
import { Card } from '../ui/card';
import { Progress } from '../ui/progress';
import type { BoardTrip } from './adapter';
import type { FleetServiceability } from '../tech-log/bridge';
import type { MaintenanceDowntimeBlock } from '../../availability/types';
import { effectiveWindow } from '../../availability/engine/downtime';
import { fleetRowsFor } from './fleet';
import { deriveTripStatus, TRIP_STATUS_STYLES } from './tripStatus';
import { TripIdentityLine } from './TripIdentity';
import { buildWindow, dayColumns, barGeometry, packLanes, type ZoomPreset } from './planBoardMath';
import { nextDuePerTail, beyondWindowWeeks } from './boardBridges';

const DAY_MS = 86400000;
const BAR_H = 30;
const BAR_GAP = 6;
const ROW_PAD = 10;
const CREW_H = 18; // the crew row under each tail's bars (D110 slice 3)

// Label density degrades with zoom: route + readiness at 2w, route at month, bare bar at quarter.
const COL_W: Record<ZoomPreset, number> = { '2w': 88, month: 44, quarter: 18 };

/**
 * Tail × time plan board (the myairops-style spatial view): one row per tail, trips as duration
 * bars colored by derived status. Same-tail overlaps stack into sub-lanes and flag as conflicts.
 * Bars label by ROUTE (how schedulers recognize trips), never by trip number. All layout math
 * lives in planBoardMath.ts (tested); this component only renders.
 */
export function PlanBoard({
  trips,
  nowMs,
  serviceability,
  downtime = [],
  marks,
  unassigned = [],
  onOpenBooking,
  onTripClick,
  onOpenHorizon,
}: {
  trips: BoardTrip[];
  nowMs: number;
  /** tail → tech-log derived GREEN/AMBER/RED; tails without a tech-log record get a hollow dot. */
  serviceability?: FleetServiceability;
  /**
   * Booked maintenance windows (LG-311). BoardBar has declared `kind: 'downtime'` as a reserved
   * extension point since this board was built and never produced one; these are it. They ride the
   * SAME lane packing as trips, so a trip booked into a maintenance window flags as a conflict
   * through the existing math rather than through new code.
   */
  downtime?: MaintenanceDowntimeBlock[];
  /** Marks on the block and the crew row under each tail (D110 slice 3), keyed by trip id. */
  marks?: Map<string, { labels: string[]; crewLabel: string | null; crewMissing: boolean }>;
  /** Submitted bookings with no aircraft — the Unassigned lane at the bottom of the board. */
  unassigned?: Array<{ id: string; title: string; route: string; departureDate: string; durationDays: number }>;
  onOpenBooking?: (tripId: string) => void;
  onTripClick: (trip: BoardTrip) => void;
  /** Optional lens switch — the shelf's "full forward picture" link (D87). */
  onOpenHorizon?: () => void;
}) {
  const [zoom, setZoom] = useState<ZoomPreset>('month');
  const [page, setPage] = useState(0);

  const window_ = useMemo(() => buildWindow(new Date(nowMs), zoom, page), [nowMs, zoom, page]);
  const cols = useMemo(() => dayColumns(window_, nowMs), [window_, nowMs]);
  const colW = COL_W[zoom];
  const boardW = window_.days * colW;

  const rows = useMemo(() => fleetRowsFor(trips).map(ac => {
    const tailTrips = trips.filter(t => t.aircraft === ac.tail);
    const bars = tailTrips
      .map(t => {
        const startMs = new Date(t.departureDate).getTime();
        return { trip: t, startMs, endMs: startMs + t.durationDays * DAY_MS };
      })
      .filter(b => barGeometry(b.startMs, b.trip.durationDays, window_) !== null);

    const downtimeBars = downtime
      .filter(b => b.tail === ac.tail)
      .map(block => {
        const w = effectiveWindow(block);
        if (!w) return null;
        const durationDays = Math.max(1, Math.ceil((w.endMs - w.startMs) / DAY_MS));
        const g = barGeometry(w.startMs, durationDays, window_);
        return g ? { block, startMs: w.startMs, endMs: w.endMs, durationDays, g } : null;
      })
      .filter((b): b is NonNullable<typeof b> => b !== null);

    // One packing over BOTH kinds: a trip overlapping a maintenance window lands in the same
    // conflictIds set the board already renders, with no new conflict logic.
    const lanes = packLanes([
      ...bars.map(b => ({ id: b.trip.id, startMs: b.startMs, endMs: b.endMs })),
      ...downtimeBars.map(b => ({ id: b.block.id, startMs: b.startMs, endMs: b.endMs })),
    ]);
    return { ac, bars, downtimeBars, lanes };
  }), [trips, downtime, window_]);

  const conflictCount = rows.reduce((n, r) => n + r.lanes.conflictIds.size, 0);

  // The board's bridges to "what's coming" (D87): a per-tail next-due chip and, below the grid,
  // per-week summaries of trips departing beyond the visible window.
  const nextDue = useMemo(() => nextDuePerTail(trips, nowMs), [trips, nowMs]);
  const windowEndMs = window_.start.getTime() + window_.days * DAY_MS;
  const beyond = useMemo(() => beyondWindowWeeks(trips, windowEndMs, nowMs), [trips, windowEndMs, nowMs]);

  // Today marker position (fractional, so it sits at the current hour within the day column).
  const todayPct = ((nowMs - window_.start.getTime()) / (window_.days * DAY_MS)) * 100;
  const todayVisible = todayPct >= 0 && todayPct <= 100;

  const monthLabel = window_.start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <Card className="overflow-hidden flex flex-col">
      <div className="px-5 py-3.5 border-b flex flex-wrap justify-between items-center gap-3">
        <h2 className="text-base font-semibold flex items-center gap-2">
          Plan board
          <span className="text-sm font-normal text-muted-foreground">{monthLabel}</span>
          {conflictCount > 0 && (
            <span className="status-badge status-error inline-flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> {conflictCount} conflicting trips
            </span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          <div className="flex bg-muted rounded-lg p-0.5 gap-0.5">
            {(['2w', 'month', 'quarter'] as ZoomPreset[]).map(z => (
              <button key={z} onClick={() => { setZoom(z); setPage(0); }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${zoom === z ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                {z === '2w' ? '2 wk' : z === 'month' ? 'Month' : 'Quarter'}
              </button>
            ))}
          </div>
          <div className="flex bg-muted rounded-lg p-0.5 gap-0.5">
            <button onClick={() => setPage(p => p - 1)} className="px-2 py-1 hover:bg-background rounded-md transition-colors"><ChevronLeft className="h-4 w-4" /></button>
            <button onClick={() => setPage(0)} className="px-2.5 py-1 hover:bg-background rounded-md transition-colors text-xs font-medium text-muted-foreground">Today</button>
            <button onClick={() => setPage(p => p + 1)} className="px-2 py-1 hover:bg-background rounded-md transition-colors"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: boardW + 176 + 176 }}>
          {/* Day header */}
          <div className="flex sticky top-0 z-20 bg-card border-b">
            <div className="w-44 shrink-0 sticky left-0 z-30 bg-card border-r px-4 py-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground flex items-end">Aircraft</div>
            <div className="relative" style={{ width: boardW }}>
              <div className="flex">
                {cols.map((c, i) => (
                  <div key={i} style={{ width: colW }}
                    className={`py-1.5 text-center border-r border-border/50 ${c.isWeekend ? 'bg-muted/50' : ''} ${c.isToday ? 'bg-blue-500/10' : ''}`}>
                    <div className={`text-[9px] font-medium ${c.isToday ? 'text-blue-600' : 'text-muted-foreground'}`}>
                      {zoom !== 'quarter' ? c.date.toLocaleDateString('en-US', { weekday: 'short' }) : ''}
                    </div>
                    <div className={`text-xs font-semibold ${c.isToday ? 'text-blue-600' : 'text-foreground/80'}`}>
                      {(zoom === 'quarter' && c.date.getDate() !== 1 && c.date.getDay() !== 1) ? '' : c.date.getDate()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="w-44 shrink-0 sticky right-0 z-30 bg-card border-l px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground flex items-end">Next due</div>
          </div>

          {/* Tail rows */}
          {rows.map(({ ac, bars, downtimeBars, lanes }) => {
            const hasCrewRow = !!marks && bars.length > 0;
            // One crew row per lane: two conflicting trips on a tail get two crew chips, not one on
            // top of the other (fresh review, 2026-09-03).
            const rowH = ROW_PAD * 2 + lanes.laneCount * BAR_H + (lanes.laneCount - 1) * BAR_GAP + (hasCrewRow ? lanes.laneCount * (CREW_H + BAR_GAP) : 0);
            const svc = serviceability?.[ac.tail];
            return (
              <div key={ac.tail} className="flex border-b border-border/50">
                <div className="w-44 shrink-0 sticky left-0 z-10 bg-card border-r px-4 flex flex-col justify-center" style={{ height: rowH }}>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        svc === 'GREEN' ? 'bg-[var(--gfo-success,#00B140)]'
                        : svc === 'AMBER' ? 'bg-[var(--gfo-warning,#F1B434)]'
                        : svc === 'RED' ? 'bg-[var(--gfo-error,#EF3340)]'
                        : 'bg-transparent border border-muted-foreground/40'
                      }`}
                      title={
                        svc === 'GREEN' ? 'Serviceable'
                        : svc === 'AMBER' ? 'Restricted (active MEL deferral)'
                        : svc === 'RED' ? 'Grounded'
                        : 'No tech-log record'
                      }
                    />
                    <span className="font-semibold text-foreground">{ac.tail}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground ml-4">{ac.type}</span>
                </div>
                <div className="relative" style={{ width: boardW, height: rowH }}>
                  {/* Day-grid background */}
                  {cols.map((c, i) => (
                    <div key={i} className={`absolute top-0 bottom-0 border-r border-border/40 ${c.isWeekend ? 'bg-muted/40' : ''}`} style={{ left: i * colW, width: colW }} />
                  ))}
                  {todayVisible && <div className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-10" style={{ left: `${todayPct}%` }} />}

                  {/* Maintenance windows — behind the trip bars, so a trip booked into one reads
                      as sitting ON the hatched band rather than beside it. */}
                  {downtimeBars.map(({ block, g }) => {
                    const lane = lanes.laneOf.get(block.id) ?? 0;
                    const conflicted = lanes.conflictIds.has(block.id);
                    return (
                      <HoverCard key={block.id} openDelay={150} closeDelay={50}>
                        <HoverCardTrigger asChild>
                          <div
                            className={`absolute z-[4] flex items-center gap-1 overflow-hidden rounded-md border border-dashed border-[var(--gfo-error,#EF3340)] bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(239,51,64,0.18)_4px,rgba(239,51,64,0.18)_8px)] px-2 text-[11px] font-medium text-[var(--gfo-error,#EF3340)] ${conflicted ? 'ring-2 ring-[var(--gfo-error,#EF3340)] ring-offset-1' : ''}`}
                            style={{ left: `${g.startPct}%`, width: `max(${g.widthPct}%, 14px)`, top: ROW_PAD + lane * (BAR_H + BAR_GAP), height: BAR_H }}
                          >
                            <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                            {zoom === '2w' && <span className="truncate">{block.maintenanceType}</span>}
                          </div>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-72 space-y-1 text-sm">
                          <p className="font-semibold">{block.tail} · {block.maintenanceType}</p>
                          <p className="text-muted-foreground">
                            Back in service {new Date(block.actualEndUtc ?? block.scheduledEndUtc).toISOString().slice(0, 10)}
                          </p>
                          {block.description && <p className="text-muted-foreground">{block.description}</p>}
                          <p className="text-xs text-muted-foreground">
                            {[block.airportIcao, block.vendorName, block.woNumber].filter(Boolean).join(' · ')}
                          </p>
                        </HoverCardContent>
                      </HoverCard>
                    );
                  })}

                  {/* Trip bars */}
                  {bars.map(({ trip, startMs }) => {
                    const g = barGeometry(startMs, trip.durationDays, window_)!;
                    const lane = lanes.laneOf.get(trip.id) ?? 0;
                    const status = deriveTripStatus(trip, nowMs);
                    const style = TRIP_STATUS_STYLES[status];
                    const conflicted = lanes.conflictIds.has(trip.id);
                    return (
                      <HoverCard key={trip.id} openDelay={150} closeDelay={50}>
                        <HoverCardTrigger asChild>
                          <button
                            onClick={() => onTripClick(trip)}
                            className={`absolute rounded-md px-2 overflow-hidden flex items-center gap-1.5 text-[11px] font-medium cursor-pointer transition-all hover:brightness-95 hover:shadow-sm z-[5] ${style.bar} ${conflicted ? 'ring-2 ring-[var(--gfo-error,#EF3340)] ring-offset-1' : ''} ${g.clippedStart ? 'rounded-l-none' : ''} ${g.clippedEnd ? 'rounded-r-none' : ''}`}
                            style={{ left: `${g.startPct}%`, width: `max(${g.widthPct}%, 14px)`, top: ROW_PAD + lane * (BAR_H + BAR_GAP), height: BAR_H }}
                          >
                            {conflicted && <AlertTriangle className="h-3 w-3 shrink-0" />}
                            {zoom !== 'quarter' && (
                              <>
                                {trip.isInternational ? <Globe className="h-2.5 w-2.5 shrink-0" /> : <MapPin className="h-2.5 w-2.5 shrink-0" />}
                                <span className="truncate">
                                  {trip.route}
                                  {zoom === '2w' && status !== 'ready' && status !== 'airborne' ? ` · ${trip.readinessScore}%` : ''}
                                </span>
                                {marks?.get(trip.id)?.labels.map(l => (
                                  <span key={l} className="shrink-0 rounded bg-background/70 px-1 text-[10px] font-semibold text-[var(--gfo-error-ink,#C81E2B)]">{l}</span>
                                ))}
                              </>
                            )}
                          </button>
                        </HoverCardTrigger>
                        <HoverCardContent side="top" className="w-80 p-4 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <TripIdentityLine trip={trip} />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`status-badge ${status === 'blocked' ? 'status-error' : status === 'behind' || status === 'attention' ? 'status-warning' : status === 'ready' || status === 'airborne' ? 'status-success' : 'status-info'}`}>{style.label}</span>
                            <span className="text-xs text-muted-foreground">{trip.client}</span>
                          </div>
                          {trip.criticalBlocker ? (
                            <div className="flex items-center gap-1.5 text-[var(--gfo-error,#EF3340)] text-xs font-medium">
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {trip.criticalBlocker}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Progress value={trip.readinessScore} className="h-1.5 flex-1" />
                              <span className="text-[11px] font-medium text-muted-foreground">{trip.readinessScore}%</span>
                            </div>
                          )}
                          {conflicted && <div className="text-xs font-medium text-[var(--gfo-error,#EF3340)]">Schedule conflict on {trip.aircraft}</div>}
                          <div className="text-[11px] text-muted-foreground">Click to open the trip's checklist</div>
                        </HoverCardContent>
                      </HoverCard>
                    );
                  })}

                  {/* The crew row (D110 slice 3): under each bar, who is flying it — or a dashed
                      gap, so an unassigned crew reads exactly like an unassigned tail. */}
                  {hasCrewRow && bars.map(({ trip, startMs }) => {
                    const g = barGeometry(startMs, trip.durationDays, window_)!;
                    const m = marks!.get(trip.id);
                    const lane = lanes.laneOf.get(trip.id) ?? 0;
                    const top = ROW_PAD + lanes.laneCount * BAR_H + (lanes.laneCount - 1) * BAR_GAP + BAR_GAP + lane * (CREW_H + BAR_GAP);
                    if (!m) return null;
                    return (
                      <div
                        key={`crew-${trip.id}`}
                        title={m.crewLabel ?? 'No crew assigned'}
                        className={`absolute z-[4] flex items-center overflow-hidden rounded px-1.5 text-[10px] font-medium ${m.crewMissing ? 'border border-dashed border-[var(--gfo-error,#EF3340)] text-[var(--gfo-error-ink,#C81E2B)]' : 'bg-muted text-muted-foreground'}`}
                        style={{ left: `${g.startPct}%`, width: `max(${g.widthPct}%, 14px)`, top, height: CREW_H }}
                      >
                        {zoom !== 'quarter' && <span className="truncate">{m.crewMissing ? 'no crew' : m.crewLabel}</span>}
                      </div>
                    );
                  })}
                </div>
                <div className="w-44 shrink-0 sticky right-0 z-10 bg-card border-l px-3 flex items-center" style={{ height: rowH }}>
                  {(() => {
                    const chip = nextDue.get(ac.tail);
                    if (!chip) return <span className="text-[11px] text-muted-foreground/60">—</span>;
                    const chipTrip = trips.find(t => t.id === chip.tripId);
                    const alarming = chip.severity !== 'upcoming';
                    return (
                      <button
                        onClick={() => chipTrip && onTripClick(chipTrip)}
                        title={chip.label}
                        className={`inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors hover:bg-muted/60 ${
                          alarming
                            ? 'border-[var(--gfo-error,#EF3340)]/60 text-[var(--gfo-error,#EF3340)]'
                            : 'border-border text-foreground'
                        }`}
                      >
                        <span className="truncate">{chip.label}</span>
                      </button>
                    );
                  })()}
                </div>
              </div>
            );
          })}

          {/* The Unassigned lane (D110 slice 3): submitted bookings with no aircraft yet. They live
              in the trips module, not the scheduling store (LG-372), so this row reads the bookings. */}
          {unassigned.length > 0 && (() => {
            const items = unassigned
              .map(u => ({ u, startMs: new Date(u.departureDate).getTime(), g: barGeometry(new Date(u.departureDate).getTime(), u.durationDays, window_) }))
              .filter((x): x is typeof x & { g: NonNullable<typeof x.g> } => x.g !== null);
            const lanes2 = packLanes(items.map(x => ({ id: x.u.id, startMs: x.startMs, endMs: x.startMs + x.u.durationDays * DAY_MS })));
            const laneCount = Math.max(1, lanes2.laneCount);
            const rowH = ROW_PAD * 2 + laneCount * BAR_H + (laneCount - 1) * BAR_GAP;
            return (
              <div className="flex border-b border-border/50 bg-[var(--gfo-error,#EF3340)]/[0.03]">
                <div className="w-44 shrink-0 sticky left-0 z-10 bg-card border-r px-4 flex flex-col justify-center" style={{ height: rowH }}>
                  <span className="font-semibold text-[var(--gfo-error-ink,#C81E2B)]">No tail</span>
                  <span className="text-[11px] text-muted-foreground">{unassigned.length} submitted</span>
                </div>
                <div className="relative" style={{ width: boardW, height: rowH }}>
                  {cols.map((c, i) => (
                    <div key={i} className={`absolute top-0 bottom-0 border-r border-border/40 ${c.isWeekend ? 'bg-muted/40' : ''}`} style={{ left: i * colW, width: colW }} />
                  ))}
                  {todayVisible && <div className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-10" style={{ left: `${todayPct}%` }} />}
                  {items.map(({ u, g }) => {
                    const lane = lanes2.laneOf.get(u.id) ?? 0;
                    return (
                      <button
                        key={u.id}
                        onClick={() => onOpenBooking?.(u.id)}
                        title={`${u.title} — submitted, no aircraft yet`}
                        className="absolute z-[5] flex items-center gap-1 overflow-hidden rounded-md border-2 border-dashed border-[var(--gfo-error,#EF3340)] bg-background px-2 text-[11px] font-medium text-[var(--gfo-error-ink,#C81E2B)] hover:bg-muted/40"
                        style={{ left: `${g.startPct}%`, width: `max(${g.widthPct}%, 14px)`, top: ROW_PAD + lane * (BAR_H + BAR_GAP), height: BAR_H }}
                      >
                        {zoom !== 'quarter' && <span className="truncate">{u.route} · assign</span>}
                      </button>
                    );
                  })}
                </div>
                <div className="w-44 shrink-0 sticky right-0 z-10 bg-card border-l px-3 flex items-center" style={{ height: rowH }}>
                  <span className="text-[11px] text-[var(--gfo-error-ink,#C81E2B)]">Assign · waiting on you</span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Beyond this window — the board's forward picture, one line per week (D87) */}
      {beyond.weeks.length > 0 && (
        <div className="px-5 py-3 border-t space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Beyond this window</span>
            <span className="text-xs text-muted-foreground">
              {beyond.weeks.reduce((n, w) => n + w.tripCount, 0) + beyond.overflowCount} trips · next action per week
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {beyond.weeks.map(w => (
              <div key={w.startMs} className="border rounded-md px-3 py-2.5">
                <div className="text-[11px] font-semibold text-foreground">
                  {new Date(w.startMs).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  {' – '}
                  {new Date(w.endMs - 1).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  <span className="text-muted-foreground font-medium"> · {w.tripCount} trip{w.tripCount === 1 ? '' : 's'}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {w.soonest
                    ? <>Soonest: {w.soonest.title} · {w.soonest.tripNumber} {w.soonest.route} · {w.soonest.dueLabel}</>
                    : 'Nothing due yet'}
                  {w.untouchedCount > 0 ? ` · ${w.untouchedCount} untouched` : ''}
                </div>
              </div>
            ))}
          </div>
          {onOpenHorizon && (
            <button onClick={onOpenHorizon} className="text-xs font-medium text-[var(--gfo-info,#2F80ED)] hover:underline">
              Open the Horizon for the full forward picture →
            </button>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="px-5 py-2.5 border-t bg-muted/30 flex flex-wrap gap-x-4 gap-y-1">
        {(Object.keys(TRIP_STATUS_STYLES) as (keyof typeof TRIP_STATUS_STYLES)[]).map(s => (
          <span key={s} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className={`w-2.5 h-2.5 rounded-sm ${TRIP_STATUS_STYLES[s].dot}`} /> {TRIP_STATUS_STYLES[s].label}
          </span>
        ))}
      </div>
    </Card>
  );
}
