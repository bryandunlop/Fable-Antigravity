import { useState } from 'react';
import { ChevronLeft, ChevronRight, Globe, MapPin } from 'lucide-react';
import { Card } from '../ui/card';
import type { BoardTrip } from './adapter';
import { deriveTripStatus, TRIP_STATUS_STYLES } from './tripStatus';

const MAX_PILLS_PER_DAY = 3;

/** Month calendar of departures — a view toggle of the Schedule surface. Pills label by route
 *  (how schedulers recognize trips) and overflow into "+N more" instead of stacking forever. */
export function CalendarView({
  trips,
  nowMs,
  onTripClick,
}: {
  trips: BoardTrip[];
  nowMs: number;
  onTripClick: (trip: BoardTrip) => void;
}) {
  const [currentDate, setCurrentDate] = useState(() => new Date(nowMs));
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const prevMonth = () => { setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)); setExpandedDays(new Set()); };
  const nextMonth = () => { setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)); setExpandedDays(new Set()); };

  return (
    <Card className="overflow-hidden flex flex-col">
      <div className="px-5 py-3.5 border-b flex justify-between items-center">
        <h2 className="text-base font-semibold">
          Calendar <span className="text-sm font-normal text-muted-foreground ml-1">{currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
        </h2>
        <div className="flex bg-muted rounded-lg p-0.5 gap-0.5">
          <button onClick={prevMonth} className="px-2 py-1 hover:bg-background rounded-md transition-colors"><ChevronLeft className="h-4 w-4" /></button>
          <button onClick={() => { setCurrentDate(new Date(nowMs)); setExpandedDays(new Set()); }} className="px-2.5 py-1 hover:bg-background rounded-md transition-colors text-xs font-medium text-muted-foreground">Today</button>
          <button onClick={nextMonth} className="px-2 py-1 hover:bg-background rounded-md transition-colors"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      <div>
        <div className="grid grid-cols-7 border-b">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-2 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground border-r border-border/50 last:border-0">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[110px] bg-muted/30 border-r border-b border-border/50 last:border-r-0" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const cellDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNum);
            const isToday = new Date(nowMs).toDateString() === cellDate.toDateString();
            const dayTrips = trips.filter(t => {
              const d = new Date(t.departureDate);
              return d.getFullYear() === cellDate.getFullYear() && d.getMonth() === cellDate.getMonth() && d.getDate() === cellDate.getDate();
            });
            const expanded = expandedDays.has(dayNum);
            const shown = expanded ? dayTrips : dayTrips.slice(0, MAX_PILLS_PER_DAY);
            const hidden = dayTrips.length - shown.length;

            return (
              <div key={dayNum} className={`min-h-[110px] border-r border-b border-border/50 p-1.5 relative group transition-colors ${isToday ? 'bg-blue-500/5' : 'bg-card hover:bg-accent/40'}`}>
                <span className={`text-xs absolute top-1.5 right-2 ${isToday ? 'font-semibold text-blue-600' : 'text-muted-foreground/60 group-hover:text-muted-foreground'}`}>{dayNum}</span>
                <div className="mt-5 flex flex-col gap-1">
                  {shown.map(trip => {
                    const style = TRIP_STATUS_STYLES[deriveTripStatus(trip, nowMs)];
                    return (
                      <button
                        key={trip.id}
                        onClick={() => onTripClick(trip)}
                        className={`px-1.5 py-1 rounded ${style.pill} text-[10px] font-medium flex items-center justify-between cursor-pointer hover:brightness-95 transition-all text-left`}
                        title={`${trip.route} · ${trip.aircraft} · ${trip.tripNumber}`}
                      >
                        <span className="flex items-center gap-1 min-w-0 truncate">
                          {trip.isInternational ? <Globe className="h-2.5 w-2.5 shrink-0" /> : <MapPin className="h-2.5 w-2.5 shrink-0" />}
                          <span className="truncate">{trip.route}</span>
                        </span>
                        <span className="opacity-75 ml-1 shrink-0">{trip.aircraft}</span>
                      </button>
                    );
                  })}
                  {hidden > 0 && (
                    <button onClick={() => setExpandedDays(s => new Set(s).add(dayNum))}
                      className="text-[10px] font-medium text-muted-foreground hover:text-foreground text-left px-1.5 py-0.5">
                      +{hidden} more
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {Array.from({ length: (7 - ((firstDay + daysInMonth) % 7)) % 7 }).map((_, i) => (
            <div key={`empty-end-${i}`} className="min-h-[110px] bg-muted/30 border-r border-b border-border/50 last:border-r-0" />
          ))}
        </div>
      </div>
    </Card>
  );
}
