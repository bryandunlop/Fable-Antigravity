import { AlertTriangle, Calendar, CheckCircle2, MapPin, Plane } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import type { BoardTrip } from './adapter';
import { deriveTripStatus, TRIP_STATUS_STYLES } from './tripStatus';

/** The master dispatch grid (original table view), consuming the shared status derivation.
 *  Blocked trips sort to the top, then chronological. */
export function DispatchTable({
  trips,
  nowMs,
  onTripClick,
}: {
  trips: BoardTrip[];
  nowMs: number;
  onTripClick: (trip: BoardTrip) => void;
}) {
  const sorted = [...trips].sort((a, b) => {
    if (a.criticalBlocker && !b.criticalBlocker) return -1;
    if (!a.criticalBlocker && b.criticalBlocker) return 1;
    return new Date(a.departureDate).getTime() - new Date(b.departureDate).getTime();
  });

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <h2 className="text-xl font-black tracking-tighter text-slate-900">Master Dispatch Grid</h2>
        <div className="flex gap-2 text-sm font-bold text-slate-500">
          <span className="bg-slate-200 px-3 py-1 rounded-full">{trips.length} Total Flights</span>
          <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full">{trips.filter(t => t.criticalBlocker).length} Blocked</span>
        </div>
      </div>

      <div className="overflow-auto max-h-[600px]">
        <Table>
          <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
            <TableRow>
              <TableHead className="font-black text-xs uppercase tracking-widest text-slate-400">Flight</TableHead>
              <TableHead className="font-black text-xs uppercase tracking-widest text-slate-400">Date</TableHead>
              <TableHead className="font-black text-xs uppercase tracking-widest text-slate-400">Aircraft</TableHead>
              <TableHead className="font-black text-xs uppercase tracking-widest text-slate-400">Route</TableHead>
              <TableHead className="font-black text-xs uppercase tracking-widest text-slate-400 text-center">Status</TableHead>
              <TableHead className="font-black text-xs uppercase tracking-widest text-slate-400">Readiness</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map(trip => {
              const status = deriveTripStatus(trip, nowMs);
              const style = TRIP_STATUS_STYLES[status];
              const amberish = status === 'behind' || status === 'attention';
              return (
                <TableRow
                  key={trip.id}
                  className={`cursor-pointer transition-colors group ${status === 'blocked' ? 'bg-rose-50/30' : 'hover:bg-slate-50'}`}
                  onClick={() => onTripClick(trip)}
                >
                  <TableCell>
                    <div className="font-black text-sm text-slate-900 group-hover:text-blue-600 transition-colors">{trip.tripNumber}</div>
                    <div className="text-[10px] font-bold text-slate-500 truncate max-w-[150px]">{trip.client}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
                      <Calendar className="h-3 w-3 text-slate-400" />
                      {new Date(trip.departureDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </TableCell>
                  <TableCell className="font-black text-slate-900 border-r border-slate-100">
                    <div className="flex items-center gap-2">
                      {trip.aircraft}
                      {trip.isInternational && <Badge className="text-[8px] px-1 bg-fuchsia-100 text-fuchsia-700 font-bold tracking-widest border-fuchsia-200 uppercase">INTL</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm font-bold text-slate-700 max-w-[200px] truncate" title={trip.route}>
                      <MapPin className="h-3 w-3 text-slate-400" />
                      {trip.route}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={`${style.badge} px-3 py-1 font-black uppercase tracking-widest text-[9px]`}>{style.label}</Badge>
                  </TableCell>
                  <TableCell>
                    {status === 'blocked' ? (
                      <div className="flex items-center gap-2 text-rose-600 text-xs font-bold w-full max-w-[200px]">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{trip.criticalBlocker}</span>
                      </div>
                    ) : status === 'airborne' ? (
                      <div className="flex items-center gap-2 text-indigo-600 text-xs font-black">
                        <Plane className="h-4 w-4" /> Airborne
                      </div>
                    ) : status === 'ready' ? (
                      <div className="flex items-center gap-2 text-emerald-600 text-xs font-black">
                        <CheckCircle2 className="h-4 w-4" /> Cleared
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 w-full max-w-[150px]">
                        <div className="h-1.5 flex-1 rounded-full overflow-hidden bg-slate-200">
                          <div className={`h-full ${amberish ? 'bg-amber-400' : 'bg-blue-400'}`} style={{ width: `${trip.readinessScore}%` }} />
                        </div>
                        <span className={`text-[10px] font-black w-8 text-right ${amberish ? 'text-amber-500' : 'text-blue-500'}`}>{trip.readinessScore}%</span>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {sorted.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="h-64 text-center text-slate-500 font-bold">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <CheckCircle2 className="h-12 w-12 text-slate-300" />
                    <p>No trips match this filter criteria.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
