import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, AlertTriangle, Globe, MapPin } from 'lucide-react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../ui/hover-card';
import { Card } from '../ui/card';
import { Progress } from '../ui/progress';
import type { BoardTrip } from './adapter';
import { fleetRowsFor } from './fleet';
import { deriveTripStatus, TRIP_STATUS_STYLES } from './tripStatus';
import { TripIdentityLine } from './TripIdentity';
import { buildWindow, dayColumns, barGeometry, packLanes, type ZoomPreset } from './planBoardMath';

const DAY_MS = 86400000;
const BAR_H = 30;
const BAR_GAP = 6;
const ROW_PAD = 10;

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
  onTripClick,
}: {
  trips: BoardTrip[];
  nowMs: number;
  onTripClick: (trip: BoardTrip) => void;
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
    const lanes = packLanes(bars.map(b => ({ id: b.trip.id, startMs: b.startMs, endMs: b.endMs })));
    return { ac, bars, lanes };
  }), [trips, window_]);

  const conflictCount = rows.reduce((n, r) => n + r.lanes.conflictIds.size, 0);

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
        <div style={{ minWidth: boardW + 176 }}>
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
          </div>

          {/* Tail rows */}
          {rows.map(({ ac, bars, lanes }) => {
            const rowH = ROW_PAD * 2 + lanes.laneCount * BAR_H + (lanes.laneCount - 1) * BAR_GAP;
            return (
              <div key={ac.tail} className="flex border-b border-border/50">
                <div className="w-44 shrink-0 sticky left-0 z-10 bg-card border-r px-4 flex flex-col justify-center" style={{ height: rowH }}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${ac.serviceable ? 'bg-[var(--gfo-success,#00B140)]' : 'bg-[var(--gfo-warning,#F1B434)]'}`} title={ac.serviceable ? 'Serviceable' : 'Restricted (MEL)'} />
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
                </div>
              </div>
            );
          })}
        </div>
      </div>

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
