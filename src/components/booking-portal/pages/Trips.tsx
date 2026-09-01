// Trips — what a booking becomes once it is Confirmed. The design note calls
// this the largest gap in v1: a portal that stops at a status chip gives the
// EA nothing to actually travel on. Itineraries here carry the details people
// ring scheduling about — times, tails, FBOs, ground, who is on which leg —
// and say plainly when the manifest locks.

import { Globe, MapPin, Plane, Ticket, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { PortalShell } from '../components/PortalShell';
import { AsOf, Chip, purposeLabel } from '../components/portalUi';
import { usePortal } from '../BookingPortalContext';
import { buildItineraries, LOCKOUT_HOURS, type Itinerary } from '../engine/itinerary';
import { cn } from '../../ui/utils';

function LockoutLine({ it }: { it: Itinerary }) {
  const window = it.international ? LOCKOUT_HOURS.international : LOCKOUT_HOURS.domestic;
  if (it.hoursToLockout < 0) {
    return (
      <span className="flex flex-wrap items-center gap-2">
        <Chip tone="flag">Manifest locked</Chip>
        <span className="text-xs text-muted-foreground">
          Passenger changes now go through scheduling — the request is logged: who asked, who approved, when.
        </span>
      </span>
    );
  }
  const hours = Math.round(it.hoursToLockout);
  return (
    <span className="flex flex-wrap items-center gap-2">
      <Chip tone="info">Manifest open</Chip>
      <span className="text-xs text-muted-foreground">
        Locks in {hours >= 48 ? `${Math.round(hours / 24)} days` : `${hours} h`} — {window} h before departure
        {it.international && ' (international: the window protects the APIS filing)'}
      </span>
    </span>
  );
}

function ItineraryCard({ it }: { it: Itinerary }) {
  const navigate = useNavigate();
  return (
    <Card>
      <CardHeader className="py-4">
        <CardTitle className="flex flex-wrap items-center gap-2.5 text-base">
          <span className="status-badge status-success p-1.5">
            {it.kind === 'seat' ? <Plane className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
          </span>
          {it.title}
          <span className="text-sm font-normal text-muted-foreground">{it.dates}</span>
          {it.international && (
            <Badge variant="outline" className="gap-1 text-[10px]"><Globe className="h-2.5 w-2.5" /> INTL</Badge>
          )}
          <Chip tone="ok">Confirmed</Chip>
          {it.kind === 'seat' && <Chip tone="gold">Seat on a scheduled trip</Chip>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {it.legs.map((leg) => (
          <div key={leg.id} className="overflow-hidden rounded-lg border">
            <div className="flex flex-wrap items-center gap-2 border-b bg-muted/50 px-4 py-2.5">
              <span className="text-sm font-medium">{leg.from} → {leg.to}</span>
              <span className="text-xs text-muted-foreground">
                {leg.date} · {leg.depart}{leg.arrive ? ` – ${leg.arrive}` : ''}
              </span>
              {leg.aircraft && <Badge variant="secondary" className="text-[10px] font-semibold">{leg.aircraft}</Badge>}
            </div>
            <div className="grid gap-x-6 gap-y-2 px-4 py-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Departure FBO</p>
                <p>{leg.fbo.from}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Arrival FBO</p>
                <p>{leg.fbo.to}</p>
              </div>
            </div>
            <div className="border-t px-4 py-2.5">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                {it.kind === 'seat' ? 'Your seat' : 'On this leg'}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {leg.passengers.map((p) => (
                  <span key={p.name} className="flex items-center gap-1.5 text-sm">
                    {p.name}
                    {p.lead && <Badge variant="secondary" className="text-[10px]">Lead</Badge>}
                    <Badge
                      variant="outline"
                      className={cn('text-[10px]', (p.purpose === 'personal' || p.purpose === 'entertainment') && 'status-warning')}
                    >
                      {purposeLabel(p.purpose)}
                    </Badge>
                  </span>
                ))}
              </div>
              {it.kind === 'seat' && (
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  The rest of this flight's manifest is not shown — it is not yours to see.
                </p>
              )}
            </div>
          </div>
        ))}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <LockoutLine it={it} />
          <span className="flex gap-2">
            {/* A trip itinerary owns its manifest; a claimed seat does not. */}
            {it.kind === 'trip' && (
              <Button variant="outline" size="sm" onClick={() => navigate(`/booking-portal/trips/${it.id}/manifest`)}>
                <Users className="mr-1.5 h-3.5 w-3.5" /> Manifest
              </Button>
            )}
            <Button variant="outline" size="sm">Add to calendar</Button>
            <Button variant="outline" size="sm">Send itinerary</Button>
          </span>
        </div>

        {(it.extras.length > 0 || it.note) && (
          <div className="rounded-lg border bg-muted/40 px-4 py-2.5 text-sm">
            {it.extras.length > 0 && <p className="text-muted-foreground">{it.extras.join(' · ')}</p>}
            {it.note && <p className="mt-0.5 italic text-muted-foreground">"{it.note}"</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Trips() {
  const { state } = usePortal();
  const itineraries = buildItineraries(state, Date.now());
  const asOf = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <PortalShell
      title="Trips"
      meta={<AsOf>{itineraries.length} confirmed · details as of {asOf}</AsOf>}
    >
      <div className="flex flex-col gap-4">
        {itineraries.map((it) => <ItineraryCard key={it.id} it={it} />)}

        {itineraries.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-12 text-center text-muted-foreground">
              <Ticket className="h-10 w-10 opacity-40" />
              <p className="font-medium">Nothing confirmed yet.</p>
              <p className="max-w-md text-sm">
                Approved trips and claimed seats land here as itineraries once scheduling places them
                on the schedule — times, tails, FBOs and who is on which leg.
              </p>
            </CardContent>
          </Card>
        )}

        <p className="text-[11px] text-muted-foreground">
          Calendar and send actions are stubs in the demo. Itinerary detail is the largest open design
          question in the v1 note — this is a first pass, deliberately concrete so it can be argued with.
        </p>
      </div>
    </PortalShell>
  );
}
