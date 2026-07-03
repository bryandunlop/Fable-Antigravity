import { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Globe, MapPin } from 'lucide-react';
import type { MockTripData } from '../mockData';
import { deriveTripStatus, TRIP_STATUS_STYLES } from './tripStatus';

const MAX_PILLS_PER_DAY = 3;

/** Month calendar of departures (the original "tactical" macro view), now consuming the shared
 *  status derivation and overflowing dense days into a "+N more" line instead of stacking forever. */
export function CalendarView({
  trips,
  nowMs,
  onTripClick,
}: {
  trips: MockTripData[];
  nowMs: number;
  onTripClick: (trip: MockTripData) => void;
}) {
  const [currentDate, setCurrentDate] = useState(() => new Date(nowMs));
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const prevMonth = () => { setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)); setExpandedDays(new Set()); };
  const nextMonth = () => { setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)); setExpandedDays(new Set()); };

  return (
    <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden flex flex-col">
      <div className="p-6 border-b flex justify-between items-center bg-slate-50">
        <h2 className="text-2xl font-black text-slate-900 flex items-center gap-4">
          <Calendar className="h-6 w-6 text-blue-500" />
          {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h2>
        <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
          <button onClick={prevMonth} className="px-3 py-1.5 hover:bg-white rounded-lg transition-colors"><ChevronLeft className="h-4 w-4" /></button>
          <button onClick={() => { setCurrentDate(new Date(nowMs)); setExpandedDays(new Set()); }} className="px-4 py-1.5 hover:bg-white rounded-lg transition-colors text-xs font-black uppercase tracking-widest text-slate-600">Today</button>
          <button onClick={nextMonth} className="px-3 py-1.5 hover:bg-white rounded-lg transition-colors"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="bg-slate-50/50">
        <div className="grid grid-cols-7 border-b border-slate-100">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 border-r border-slate-100 last:border-0">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 border-b border-slate-100">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[120px] bg-slate-50/30 border-r border-slate-100 last:border-0 border-b border-slate-100" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const cellDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNum);
            const dayTrips = trips.filter(t => {
              const d = new Date(t.departureDate);
              return d.getFullYear() === cellDate.getFullYear() && d.getMonth() === cellDate.getMonth() && d.getDate() === cellDate.getDate();
            });
            const expanded = expandedDays.has(dayNum);
            const shown = expanded ? dayTrips : dayTrips.slice(0, MAX_PILLS_PER_DAY);
            const hidden = dayTrips.length - shown.length;

            return (
              <div key={dayNum} className="min-h-[120px] bg-white border-r border-b border-slate-100 p-2 relative group hover:bg-slate-50 transition-colors">
                <span className="text-xs font-black text-slate-300 absolute top-2 right-2 group-hover:text-slate-500 transition-colors">{dayNum}</span>
                <div className="mt-6 flex flex-col gap-1.5">
                  {shown.map(trip => {
                    const style = TRIP_STATUS_STYLES[deriveTripStatus(trip, nowMs)];
                    return (
                      <div
                        key={trip.id}
                        onClick={() => onTripClick(trip)}
                        className={`px-2 py-1.5 rounded-md ${style.pill} text-[9px] font-black tracking-widest flex items-center justify-between cursor-pointer hover:-translate-y-0.5 hover:shadow-md transition-all relative`}
                        title={trip.tripNumber}
                      >
                        <div className="flex items-center gap-1 min-w-0 truncate">
                          {trip.isInternational ? <Globe className="h-2.5 w-2.5 shrink-0" /> : <MapPin className="h-2.5 w-2.5 shrink-0" />}
                          <span className="truncate">{trip.route}</span>
                        </div>
                        <span className="opacity-80 ml-1.5 shrink-0">{trip.aircraft}</span>
                      </div>
                    );
                  })}
                  {hidden > 0 && (
                    <button onClick={() => setExpandedDays(s => new Set(s).add(dayNum))}
                      className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-700 text-left px-2 py-1">
                      +{hidden} more
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {Array.from({ length: (7 - ((firstDay + daysInMonth) % 7)) % 7 }).map((_, i) => (
            <div key={`empty-end-${i}`} className="min-h-[120px] bg-slate-50/30 border-r border-slate-100 border-b border-slate-100 last:border-0" />
          ))}
        </div>
      </div>
    </div>
  );
}
