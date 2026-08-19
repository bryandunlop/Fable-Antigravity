import { Globe, MapPin, Shield } from 'lucide-react';
import { Badge } from '../ui/badge';

// The one way a trip is identified everywhere in the hub (board hovers, action-center clusters,
// the trip drawer header). Schedulers recognize trips by ROUTE + DATE + TAIL — "the London trip
// on the 25th on 650GS" — so those lead; the trip number is secondary reference text.

export interface TripIdentityData {
  tripNumber: string;
  route: string;
  aircraft: string; // tail
  departureDate: string;
  durationDays: number;
  isInternational: boolean;
  client?: string; // trip-type label until myairops brings real client names (Phase 2)
  priority?: 'standard' | 'vip' | 'urgent';
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

function TypeBadge({ t }: { t: TripIdentityData }) {
  if (t.client?.includes('DASSP')) {
    return <Badge variant="outline" className="gap-1 text-[10px] px-1.5"><Shield className="h-2.5 w-2.5" /> DCA</Badge>;
  }
  if (t.isInternational) {
    return <Badge variant="outline" className="gap-1 text-[10px] px-1.5"><Globe className="h-2.5 w-2.5" /> INTL</Badge>;
  }
  return null;
}

/** Compact one-line identity for rows and cluster headers. `compact` drops the trip number —
 * dense worklist rows (the Horizon spine) lean on route+date+tail; the drawer owns the number. */
export function TripIdentityLine({ trip, compact = false }: { trip: TripIdentityData; compact?: boolean }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
      <Badge variant="secondary" className="px-1.5 text-[10px] font-semibold shrink-0">{trip.aircraft}</Badge>
      <span className="font-medium text-foreground truncate">{trip.route}</span>
      <span className="text-xs text-muted-foreground shrink-0">
        {fmtDate(trip.departureDate)}{trip.durationDays > 1 ? ` – ${fmtDate(new Date(new Date(trip.departureDate).getTime() + trip.durationDays * 86400000).toISOString())}` : ''}
      </span>
      <TypeBadge t={trip} />
      {trip.priority === 'vip' && <Badge variant="outline" className="text-[10px] px-1.5">VIP</Badge>}
      {!compact && <span className="text-[11px] text-muted-foreground/70 shrink-0">{trip.tripNumber}</span>}
    </span>
  );
}

/** Large identity header for the trip drawer — unmissable "this is the trip you're in". */
export function TripIdentityHeader({ trip }: { trip: TripIdentityData }) {
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <MapPin className="h-5 w-5 text-muted-foreground shrink-0" />
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{trip.route}</h2>
        <TypeBadge t={trip} />
        {trip.priority === 'vip' && <Badge variant="outline">VIP</Badge>}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground pl-7">
        <Badge variant="secondary" className="font-semibold">{trip.aircraft}</Badge>
        <span>
          {fmtDate(trip.departureDate)}
          {trip.durationDays > 1 && ` – ${fmtDate(new Date(new Date(trip.departureDate).getTime() + trip.durationDays * 86400000).toISOString())}`}
          {' '}· {trip.durationDays} day{trip.durationDays > 1 ? 's' : ''}
        </span>
        <span>· {trip.client}</span>
        <span className="text-muted-foreground/70">· {trip.tripNumber}</span>
      </div>
    </div>
  );
}
