import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, AlertTriangle, Globe, MapPin, Calendar } from 'lucide-react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../../ui/hover-card';
import { Badge } from '../../ui/badge';
import { FLEET, type MockTripData } from '../mockData';
import { deriveTripStatus, TRIP_STATUS_STYLES } from './tripStatus';
import { buildWindow, dayColumns, barGeometry, packLanes, ZOOM_DAYS, type ZoomPreset } from './planBoardMath';

const DAY_MS = 86400000;
const BAR_H = 30;
const BAR_GAP = 6;
const ROW_PAD = 10;

// Label density degrades with zoom: full route + readiness at 2w, trip number at month, bare bar at quarter.
const COL_W: Record<ZoomPreset, number> = { '2w': 88, month: 44, quarter: 18 };

/**
 * Tail × time plan board (the myairops-style spatial view): one row per tail, trips as duration
 * bars colored by derived status. Same-tail overlaps stack into sub-lanes and flag as conflicts.
 * All layout math lives in planBoardMath.ts (tested); this component only renders.
 */
export function PlanBoard({
  trips,
  nowMs,
  onTripClick,
}: {
  trips: MockTripData[];
  nowMs: number;
  onTripClick: (trip: MockTripData) => void;
}) {
  const [zoom, setZoom] = useState<ZoomPreset>('month');
  const [page, setPage] = useState(0);

  const window_ = useMemo(() => buildWindow(new Date(nowMs), zoom, page), [nowMs, zoom, page]);
  const cols = useMemo(() => dayColumns(window_, nowMs), [window_, nowMs]);
  const colW = COL_W[zoom];
  const boardW = window_.days * colW;

  const rows = useMemo(() => FLEET.map(ac => {
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
    <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden flex flex-col">
      <div className="p-6 border-b flex flex-wrap justify-between items-center gap-4 bg-slate-50">
        <h2 className="text-2xl font-black text-slate-900 flex items-center gap-4">
          <Calendar className="h-6 w-6 text-blue-500" />
          Plan Board <span className="text-base font-bold text-slate-400">{monthLabel}</span>
        </h2>
        <div className="flex items-center gap-3">
          {conflictCount > 0 && (
            <Badge className="bg-rose-100 text-rose-700 px-3 py-1 font-black uppercase tracking-widest text-[10px]">
              <AlertTriangle className="h-3 w-3 mr-1" /> {conflictCount} conflicting trips
            </Badge>
          )}
          <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
            {(['2w', 'month', 'quarter'] as ZoomPreset[]).map(z => (
              <button key={z} onClick={() => { setZoom(z); setPage(0); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-colors ${zoom === z ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}>
                {z === '2w' ? '2 wk' : z}
              </button>
            ))}
          </div>
          <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
            <button onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 hover:bg-white rounded-lg transition-colors"><ChevronLeft className="h-4 w-4" /></button>
            <button onClick={() => setPage(0)} className="px-4 py-1.5 hover:bg-white rounded-lg transition-colors text-xs font-black uppercase tracking-widest text-slate-600">Today</button>
            <button onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 hover:bg-white rounded-lg transition-colors"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: boardW + 176 }}>
          {/* Day header */}
          <div className="flex sticky top-0 z-20 bg-white border-b border-slate-100">
            <div className="w-44 shrink-0 sticky left-0 z-30 bg-white border-r border-slate-200 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-end">Aircraft</div>
            <div className="relative" style={{ width: boardW }}>
              <div className="flex">
                {cols.map((c, i) => (
                  <div key={i} style={{ width: colW }}
                    className={`py-2 text-center border-r border-slate-100 ${c.isWeekend ? 'bg-slate-50' : ''} ${c.isToday ? 'bg-blue-50' : ''}`}>
                    <div className={`text-[9px] font-black uppercase tracking-widest ${c.isToday ? 'text-blue-600' : 'text-slate-400'}`}>
                      {zoom !== 'quarter' ? c.date.toLocaleDateString('en-US', { weekday: 'short' }) : ''}
                    </div>
                    <div className={`text-xs font-black ${c.isToday ? 'text-blue-600' : 'text-slate-600'}`}>
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
              <div key={ac.tail} className="flex border-b border-slate-100">
                <div className="w-44 shrink-0 sticky left-0 z-10 bg-white border-r border-slate-200 px-4 flex flex-col justify-center" style={{ height: rowH }}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${ac.serviceable ? 'bg-emerald-500' : 'bg-amber-400'}`} title={ac.serviceable ? 'Serviceable' : 'Restricted (MEL)'} />
                    <span className="font-black text-slate-900">{ac.tail}</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 ml-4">{ac.type}</span>
                </div>
                <div className="relative" style={{ width: boardW, height: rowH }}>
                  {/* Day-grid background */}
                  {cols.map((c, i) => (
                    <div key={i} className={`absolute top-0 bottom-0 border-r border-slate-100 ${c.isWeekend ? 'bg-slate-50/70' : ''}`} style={{ left: i * colW, width: colW }} />
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
                            className={`absolute rounded-md px-2 overflow-hidden flex items-center gap-1.5 text-[10px] font-black tracking-wide cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md z-[5] ${style.bar} ${conflicted ? 'ring-2 ring-rose-500 ring-offset-1' : ''} ${g.clippedStart ? 'rounded-l-none' : ''} ${g.clippedEnd ? 'rounded-r-none' : ''}`}
                            style={{ left: `${g.startPct}%`, width: `max(${g.widthPct}%, 14px)`, top: ROW_PAD + lane * (BAR_H + BAR_GAP), height: BAR_H }}
                          >
                            {conflicted && <AlertTriangle className="h-3 w-3 shrink-0" />}
                            {zoom !== 'quarter' && (
                              <>
                                {trip.isInternational ? <Globe className="h-2.5 w-2.5 shrink-0" /> : <MapPin className="h-2.5 w-2.5 shrink-0" />}
                                <span className="truncate">{zoom === '2w' ? `${trip.tripNumber.slice(-7)} · ${trip.route}${status !== 'ready' && status !== 'airborne' ? ` · ${trip.readinessScore}%` : ''}` : trip.tripNumber.slice(-7)}</span>
                              </>
                            )}
                          </button>
                        </HoverCardTrigger>
                        <HoverCardContent side="top" className="w-72 p-4">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-black text-slate-900">{trip.tripNumber}</span>
                            <Badge className={`${style.badge} px-2 font-black uppercase tracking-widest text-[9px]`}>{style.label}</Badge>
                          </div>
                          <div className="mt-1.5 text-sm font-bold text-slate-700 flex items-center gap-1.5">
                            {trip.isInternational ? <Globe className="h-3.5 w-3.5 text-slate-400" /> : <MapPin className="h-3.5 w-3.5 text-slate-400" />}
                            {trip.route}
                          </div>
                          <div className="text-xs font-bold text-slate-500 mt-0.5">{trip.client} · {trip.aircraft}</div>
                          <div className="text-xs font-bold text-slate-500">
                            {new Date(trip.departureDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {trip.durationDays} day{trip.durationDays > 1 ? 's' : ''}
                          </div>
                          {trip.criticalBlocker ? (
                            <div className="mt-2 flex items-center gap-1.5 text-rose-600 text-xs font-bold"><AlertTriangle className="h-3.5 w-3.5" /> {trip.criticalBlocker}</div>
                          ) : (
                            <div className="mt-2 flex items-center gap-2">
                              <div className="h-1.5 flex-1 rounded-full overflow-hidden bg-slate-200">
                                <div className="h-full bg-blue-400" style={{ width: `${trip.readinessScore}%` }} />
                              </div>
                              <span className="text-[10px] font-black text-blue-500">{trip.readinessScore}%</span>
                            </div>
                          )}
                          {conflicted && <div className="mt-1.5 text-[10px] font-black uppercase tracking-widest text-rose-600">Schedule conflict on {trip.aircraft}</div>}
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
      <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex flex-wrap gap-4">
        {(Object.keys(TRIP_STATUS_STYLES) as (keyof typeof TRIP_STATUS_STYLES)[]).map(s => (
          <span key={s} className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500">
            <span className={`w-2.5 h-2.5 rounded-sm ${TRIP_STATUS_STYLES[s].dot}`} /> {TRIP_STATUS_STYLES[s].label}
          </span>
        ))}
      </div>
    </div>
  );
}
