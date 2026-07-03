import { AlertTriangle, CheckCircle2, Plane } from 'lucide-react';
import { Card } from '../ui/card';
import { Progress } from '../ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import type { BoardTrip } from './adapter';
import { deriveTripStatus, TRIP_STATUS_STYLES } from './tripStatus';
import { TripIdentityLine } from './TripIdentity';

/** List view of the Schedule surface. Blocked trips sort to the top, then chronological;
 *  every row leads with the route+date+tail identity. */
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

  const badgeTone = (s: ReturnType<typeof deriveTripStatus>) =>
    s === 'blocked' ? 'status-error'
      : s === 'behind' || s === 'attention' ? 'status-warning'
      : s === 'ready' || s === 'airborne' ? 'status-success'
      : 'status-info';

  return (
    <Card className="overflow-hidden flex flex-col">
      <div className="px-5 py-3.5 border-b flex items-center justify-between">
        <h2 className="text-base font-semibold">All trips</h2>
        <div className="flex gap-2 text-xs text-muted-foreground">
          <span>{trips.length} trips</span>
          <span>·</span>
          <span className="text-[var(--gfo-error,#EF3340)] font-medium">{trips.filter(t => t.criticalBlocker).length} blocked</span>
        </div>
      </div>

      <div className="overflow-auto max-h-[640px]">
        <Table>
          <TableHeader className="bg-muted/50 sticky top-0 z-10">
            <TableRow>
              <TableHead className="text-xs">Trip</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Readiness</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map(trip => {
              const status = deriveTripStatus(trip, nowMs);
              const style = TRIP_STATUS_STYLES[status];
              return (
                <TableRow
                  key={trip.id}
                  className={`cursor-pointer transition-colors ${status === 'blocked' ? 'bg-[var(--gfo-error,#EF3340)]/5' : 'hover:bg-accent/50'}`}
                  onClick={() => onTripClick(trip)}
                >
                  <TableCell className="py-3">
                    <TripIdentityLine trip={trip} />
                    <div className="text-xs text-muted-foreground mt-0.5">{trip.client}</div>
                  </TableCell>
                  <TableCell className="py-3">
                    <span className={`status-badge ${badgeTone(status)}`}>{style.label}</span>
                  </TableCell>
                  <TableCell className="py-3">
                    {status === 'blocked' ? (
                      <div className="flex items-center gap-1.5 text-[var(--gfo-error,#EF3340)] text-xs font-medium max-w-[260px]">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{trip.criticalBlocker}</span>
                      </div>
                    ) : status === 'airborne' ? (
                      <div className="flex items-center gap-1.5 text-indigo-600 text-xs font-medium">
                        <Plane className="h-3.5 w-3.5" /> Airborne
                      </div>
                    ) : status === 'ready' ? (
                      <div className="flex items-center gap-1.5 text-[var(--gfo-success,#00B140)] text-xs font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Cleared
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 max-w-[180px]">
                        <Progress value={trip.readinessScore} className="h-1.5 flex-1" />
                        <span className="text-[11px] font-medium text-muted-foreground w-8 text-right">{trip.readinessScore}%</span>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {sorted.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={3} className="h-48 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <CheckCircle2 className="h-8 w-8 opacity-40" />
                    <p className="text-sm">No trips match this filter.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
