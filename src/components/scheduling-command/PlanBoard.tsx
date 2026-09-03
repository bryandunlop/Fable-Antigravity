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
import { cardTone, cardProblemLine, fieldOf, CARD_TONE_CLASS } from './boardCard';
import { aircraftFor } from '../../fleet/registry';
import { TripIdentityLine } from './TripIdentity';
import { buildWindow, dayColumns, barGeometry, packLanes, type ZoomPreset } from './planBoardMath';
import { nextDuePerTail, beyondWindowWeeks } from './boardBridges';

const DAY_MS = 86400000;
const BAR_H = 30;
const BAR_GAP = 6;
const ROW_PAD = 10;
const CARD_H = 64; // a trip is a three-line card at 2w/month (LG-396); the quarter zoom keeps thin bars
const CARD_MIN_W = 150; // the label floor — a card is never narrower than its words

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
    // A bar runs from departure to the LAST ARRIVAL, in real hours — never rounded up to whole
    // days. Rounding made a 21:00 departure occupy the next morning and flagged a maintenance
    // window it never touched as a conflict (Bryan, 2026-09-03: a tail is never double-booked).
    const MIN_SPAN = 2 * 3_600_000;
    const bars = tailTrips
      .map(t => {
        const startMs = new Date(t.departureDate).getTime();
        const endMs = Math.max(new Date(t.arrivalDate ?? t.departureDate).getTime(), startMs + MIN_SPAN);
        return { trip: t, startMs, endMs, spanDays: (endMs - startMs) / DAY_MS };
      })
      .filter(b => barGeometry(b.startMs, b.spanDays, window_) !== null);

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
    // Lanes pack by TIME only: a second lane means a real double booking, and a tail is never
    // double-booked (Bryan, 2026-09-03). The label floor is handled below by nudging a card to the
    // right of the one before it, never by stacking — a nudged card is not a conflict.
    const lanes = packLanes([
      ...bars.map(b => ({ id: b.trip.id, startMs: b.startMs, endMs: b.endMs })),
      ...downtimeBars.map(b => ({ id: b.block.id, startMs: b.startMs, endMs: b.endMs })),
    ]);
    // Two different things: a trip on top of another trip (a double booking — never, per Bryan)
    // and a trip inside a maintenance window (an alert, drawn as the hatch). Count them apart.
    const tripOnly = packLanes(bars.map(b => ({ id: b.trip.id, startMs: b.startMs, endMs: b.endMs })));
    const doubleBooked = tripOnly.conflictIds.size;
    const inMaintenance = bars.filter(b => lanes.conflictIds.has(b.trip.id) && !tripOnly.conflictIds.has(b.trip.id)).length;
    // Drawn positions: time position in px, then each card sits at least 4px right of the previous
    // card in its lane, so the label floor never puts one card over another.
    const drawnLeft = new Map<string, number>();
    const byLane = new Map<number, typeof bars>();
    for (const b of bars) { const l = lanes.laneOf.get(b.trip.id) ?? 0; (byLane.get(l) ?? byLane.set(l, []).get(l)!).push(b); }
    for (const [, list] of byLane) {
      let prevRight = -Infinity;
      for (const b of [...list].sort((x, y) => x.startMs - y.startMs)) {
        const g = barGeometry(b.startMs, b.spanDays, window_)!;
        const timeLeft = (g.startPct / 100) * boardW;
        const widthPx = zoom !== 'quarter' ? Math.max((g.widthPct / 100) * boardW, CARD_MIN_W) : Math.max((g.widthPct / 100) * boardW, 14);
        const left = Math.max(timeLeft, prevRight + 4);
        drawnLeft.set(b.trip.id, left);
        prevRight = left + widthPx;
      }
    }
    return { ac, bars, downtimeBars, lanes, drawnLeft, doubleBooked, inMaintenance };
  }), [trips, downtime, window_, zoom, colW, boardW]);

  const doubleBookedCount = rows.reduce((n, r) => n + r.doubleBooked, 0);
  const inMaintenanceCount = rows.reduce((n, r) => n + r.inMaintenance, 0);

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
          {doubleBookedCount > 0 && (
            <span className="status-badge status-error inline-flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> {doubleBookedCount} double-booked
            </span>
          )}
          {inMaintenanceCount > 0 && (
            <span className="status-badge status-warning inline-flex items-center gap-1" title="A trip booked inside a maintenance window — the serviceability alert, not a double booking">
              <AlertTriangle className="h-3 w-3" /> {inMaintenanceCount} inside a maintenance window
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
          {rows.map(({ ac, bars, downtimeBars, lanes, drawnLeft }) => {
            // Cards (LG-396): line 1 where and who, line 2 crew, line 3 what is wrong — the crew row
            // folded into the card. The quarter zoom cannot fit words, so it keeps the thin bars.
            const cards = zoom !== 'quarter';
            const barH = cards ? CARD_H : BAR_H;
            const rowH = ROW_PAD * 2 + lanes.laneCount * barH + (lanes.laneCount - 1) * BAR_GAP;
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

                  {/* Trip cards (LG-396, Bryan: B with A's stripe). The tint is the worst problem, the
                      4px stripe on the left edge is the derived status, and the words never truncate to
                      the bar's width: the card is as wide as its days, with a floor for the label. */}
                  {bars.map(({ trip, startMs, spanDays }) => {
                    const g = barGeometry(startMs, spanDays, window_)!;
                    const lane = lanes.laneOf.get(trip.id) ?? 0;
                    const status = deriveTripStatus(trip, nowMs);
                    const style = TRIP_STATUS_STYLES[status];
                    const conflicted = lanes.conflictIds.has(trip.id);
                    const m = marks?.get(trip.id);
                    const facts = { labels: m?.labels ?? [], crewMissing: !!m?.crewMissing, status, openTasks: trip.tasks.filter(t => t.status === 'open' || t.status === 'in_progress' || t.status === 'blocked').length };
                    const tone = cardTone(facts);
                    const field = fieldOf(trip.route, aircraftFor(ac.tail)?.homeBase ?? 'KLUK');
                    const line1 = `${field}${trip.lead ? ` · ${trip.lead}` : ''}${trip.aboard ? ` · ${trip.aboard}` : ''}`;
                    const trueLeft = (g.startPct / 100) * boardW;
                    const nudgedPx = (drawnLeft.get(trip.id) ?? trueLeft) - trueLeft;
                    return (
                      <HoverCard key={trip.id} openDelay={150} closeDelay={50}>
                        {/* A nudged card carries a tick at its true departure, so the eye can trace it back to the day. */}
                        {nudgedPx > 2 && (
                          <span aria-hidden className="absolute z-[6] bg-foreground/50" style={{ left: trueLeft, width: 2, top: ROW_PAD + lane * (barH + BAR_GAP), height: barH }} />
                        )}
                        <HoverCardTrigger asChild>
                          <button
                            onClick={() => onTripClick(trip)}
                            className={`absolute z-[5] cursor-pointer overflow-hidden text-left transition-all hover:brightness-95 hover:shadow-sm ${cards ? `rounded-md ${CARD_TONE_CLASS[tone]}` : `rounded-md px-2 flex items-center gap-1.5 text-[11px] font-medium ${style.bar}`} ${conflicted ? 'ring-2 ring-[var(--gfo-error,#EF3340)] ring-offset-1' : ''} ${g.clippedStart ? 'rounded-l-none' : ''} ${g.clippedEnd ? 'rounded-r-none' : ''}`}
                            style={{ left: drawnLeft.get(trip.id) ?? `${g.startPct}%`, width: cards ? `max(${g.widthPct}%, ${CARD_MIN_W}px)` : `max(${g.widthPct}%, 14px)`, top: ROW_PAD + lane * (barH + BAR_GAP), height: barH }}
                          >
                            {cards ? (
                              <>
                                {/* A's edge line: the derived status, 4px, on the left. */}
                                <span className={`absolute left-0 top-0 bottom-0 w-1 ${style.dot}`} aria-hidden />
                                <div className="pl-3 pr-2 py-1.5 leading-tight">
                                  <div className="flex items-center gap-1 text-[12px] font-semibold text-foreground whitespace-nowrap">
                                    {conflicted && <AlertTriangle className="h-3 w-3 shrink-0 text-[var(--gfo-error,#EF3340)]" />}
                                    {trip.isInternational ? <Globe className="h-3 w-3 shrink-0 opacity-70" /> : <MapPin className="h-3 w-3 shrink-0 opacity-70" />}
                                    <span>{line1}</span>
                                  </div>
                                  <div className="text-[11px] text-muted-foreground whitespace-nowrap">{m ? (m.crewMissing ? 'no crew' : m.crewLabel) : trip.client}</div>
                                  <div className="text-[11px] font-medium whitespace-nowrap">{cardProblemLine(facts)}</div>
                                </div>
                              </>
                            ) : (
                              <>{conflicted && <AlertTriangle className="h-3 w-3 shrink-0" />}</>
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
            const uLeft = new Map<string, number>();
            { let prevRight = -Infinity; for (const x of [...items].sort((a, b) => a.startMs - b.startMs)) { const w = zoom !== 'quarter' ? Math.max((x.g.widthPct / 100) * boardW, CARD_MIN_W) : 14; const left = Math.max((x.g.startPct / 100) * boardW, prevRight + 4); uLeft.set(x.u.id, left); prevRight = left + w; } }
            const laneCount = Math.max(1, lanes2.laneCount);
            const uH = zoom !== 'quarter' ? CARD_H : BAR_H;
            const rowH = ROW_PAD * 2 + laneCount * uH + (laneCount - 1) * BAR_GAP;
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
                        className="absolute z-[5] overflow-hidden rounded-md border-2 border-dashed border-[var(--gfo-error,#EF3340)] bg-background px-2 py-1.5 text-left text-[11px] font-medium leading-tight text-[var(--gfo-error-ink,#C81E2B)] hover:bg-muted/40"
                        style={{ left: uLeft.get(u.id) ?? `${g.startPct}%`, width: zoom !== 'quarter' ? `max(${g.widthPct}%, ${CARD_MIN_W}px)` : `max(${g.widthPct}%, 14px)`, top: ROW_PAD + lane * (uH + BAR_GAP), height: uH }}
                      >
                        {zoom !== 'quarter' && <><div className="text-[12px] font-semibold whitespace-nowrap">{u.route}</div><div className="whitespace-nowrap">{u.title}</div><div className="whitespace-nowrap">no tail · assign</div></>}
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
