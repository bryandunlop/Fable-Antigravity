// How a booking request is identified everywhere on the scheduling side —
// the same move TripIdentity makes for trips. Schedulers recognise a request
// by ROUTE + DATES + WHO, so those lead; the request number is reference text.

import { Globe, MapPin } from 'lucide-react';
import { Badge } from '../../ui/badge';
import type { Passenger, TripRequest } from '../types';
import { routeLabel } from '../engine/lifecycle';

const fmt = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

function dateSpan(request: TripRequest): string {
  if (request.legs.length === 0) return '—';
  const first = request.legs[0].date;
  const last = request.legs[request.legs.length - 1].date;
  return first === last ? fmt(first) : `${fmt(first)} – ${fmt(last)}`;
}

/** Any leg leaving the domestic pattern — the demo's stand-in for a real INTL check. */
function isInternational(request: TripRequest): boolean {
  return request.legs.some((l) => !/^K[A-Z]{3}$/.test(l.from) || !/^K[A-Z]{3}$/.test(l.to));
}

export function TierBadge({ tier }: { tier: 1 | 2 | 3 }) {
  return (
    <Badge variant={tier === 1 ? 'default' : 'secondary'} className="px-1.5 text-[10px] font-semibold shrink-0">
      T{tier}
    </Badge>
  );
}

export function RequestIdentityLine({
  request,
  passengers,
}: {
  request: TripRequest;
  passengers: Passenger[];
}) {
  const principal = passengers.find((p) => p.id === request.principalId);
  const paxCount = new Set(request.legs.flatMap((l) => l.passengers.map((p) => p.passengerId))).size;
  return (
    <span className="inline-flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
      <TierBadge tier={request.tier} />
      <span className="truncate font-medium text-foreground">{routeLabel(request)}</span>
      <span className="shrink-0 text-xs text-muted-foreground">{dateSpan(request)}</span>
      {isInternational(request) && (
        <Badge variant="outline" className="gap-1 px-1.5 text-[10px]"><Globe className="h-2.5 w-2.5" /> INTL</Badge>
      )}
      <span className="shrink-0 text-xs text-muted-foreground">
        {principal?.name ?? '—'} · {paxCount} pax
      </span>
      <span className="shrink-0 text-[11px] text-muted-foreground/70">{request.id}</span>
    </span>
  );
}

export function RequestIdentityHeader({
  request,
  passengers,
}: {
  request: TripRequest;
  passengers: Passenger[];
}) {
  const principal = passengers.find((p) => p.id === request.principalId);
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <MapPin className="h-5 w-5 shrink-0 text-muted-foreground" />
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{routeLabel(request)}</h2>
        {isInternational(request) && (
          <Badge variant="outline" className="gap-1"><Globe className="h-3 w-3" /> INTL</Badge>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 pl-7 text-sm text-muted-foreground">
        <TierBadge tier={request.tier} />
        <span>{dateSpan(request)}</span>
        <span>· {principal?.name ?? '—'}</span>
        <span>· requested by {request.requestedBy}</span>
        <span className="text-muted-foreground/70">· {request.id}</span>
      </div>
    </div>
  );
}
