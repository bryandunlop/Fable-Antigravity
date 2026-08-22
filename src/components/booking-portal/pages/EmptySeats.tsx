// Frame G — empty seats: browse under the same eligibility projection as the
// calendar, ask for a seat, and watch the ask ride the 14:00 clear. A seat
// always rides someone else's trip; the caveat travels with it.

import { useState } from 'react';
import { Plane } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { PortalShell } from '../components/PortalShell';
import { AsOf, Chip, SectionLabel } from '../components/portalUi';
import { usePortal } from '../BookingPortalContext';
import type { Purpose } from '../types';
import { cn } from '../../ui/utils';

export default function EmptySeats() {
  const { state, dispatch } = usePortal();
  const [askingFor, setAskingFor] = useState<string | null>(null);
  const [passengerId, setPassengerId] = useState('P-TANAKA');
  const [purpose, setPurpose] = useState<Purpose>('business');

  const open = state.flights.filter(
    (f) => f.seatsOpen > 0 || state.seatAsks.some((s) => s.flightId === f.id && s.status !== 'withdrawn'),
  );
  const asOf = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const passenger = state.passengers.find((p) => p.id === passengerId);
  const askFlight = state.flights.find((f) => f.id === askingFor);
  const field = 'w-full rounded-md border bg-background px-2.5 py-1.5 text-sm';

  return (
    <PortalShell title="Empty seats" meta={<AsOf>Next 30 days · seats as of {asOf} · advisory</AsOf>}>
      <div className="grid gap-4 lg:grid-cols-[1fr_330px]">
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="flex flex-wrap items-center gap-2.5 text-base">
              <span className="status-badge status-info p-1.5"><Plane className="h-4 w-4" /></span>
              Flights with a spare seat
              <Badge variant={open.length ? 'secondary' : 'outline'}>{open.length}</Badge>
              <span className="text-xs font-normal text-muted-foreground">each rides a scheduled trip</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 pt-0">
            {open.map((f) => {
              const asks = state.seatAsks.filter((s) => s.flightId === f.id && s.status !== 'withdrawn');
              return (
                <div key={f.id} className="overflow-hidden rounded-lg border">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/50 px-4 py-2.5">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{f.from} → {f.to}</span>
                      <span className="text-xs text-muted-foreground">{f.date} · {f.depart} – {f.arrive}</span>
                      <Badge variant="secondary" className="text-[10px] font-semibold">{f.aircraft}</Badge>
                      {f.seatsOpen > 0 && (
                        <Chip tone="ok">{f.seatsOpen} seat{f.seatsOpen === 1 ? '' : 's'} open</Chip>
                      )}
                    </span>
                    {f.seatsOpen > 0 && (
                      <Button variant="outline" size="sm" onClick={() => setAskingFor(f.id)}>Ask for a seat</Button>
                    )}
                  </div>
                  <div className="px-4 py-2.5">
                    <p className="text-xs text-muted-foreground">Subject to change until departure — the trip is not yours.</p>
                    {asks.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1.5">
                        {asks.map((s) => {
                          const p = state.passengers.find((x) => x.id === s.passengerId);
                          return (
                            <span key={s.id} className="flex items-center gap-1.5 text-xs">
                              {s.status === 'requested' && <Chip tone="info">Seat requested — decision by 14:00</Chip>}
                              {s.status === 'confirmed' && <Chip tone="ok">Seat confirmed</Chip>}
                              {s.status === 'released' && <Chip tone="neutral">Released</Chip>}
                              {s.status === 'reconfirm' && <Chip tone="flag">Flight changed — reconfirm</Chip>}
                              <span>{p?.name}</span>
                              {s.status === 'requested' && (
                                <button type="button" className="underline hover:text-foreground" onClick={() => dispatch({ type: 'WITHDRAW_SEAT', id: s.id })}>
                                  withdraw
                                </button>
                              )}
                              {s.status === 'confirmed' && (
                                <button type="button" className="underline hover:text-foreground" onClick={() => dispatch({ type: 'RELEASE_SEAT', id: s.id })}>
                                  release
                                </button>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {open.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No open seats in the window.</p>}
            <p className="pt-1 text-xs text-muted-foreground">
              Same confidentiality projection as the calendar — no manifest, no trip owner on flights you are
              not part of. A withdrawn or released seat returns to the pool at the next clear.
            </p>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader className="py-4"><CardTitle className="text-base">Ask for a seat</CardTitle></CardHeader>
          <CardContent className="pt-0">
            {askFlight ? (
              <div className="space-y-3">
                <p className="text-sm font-medium">{askFlight.from} → {askFlight.to} · {askFlight.date}</p>
                <div>
                  <SectionLabel>Passenger</SectionLabel>
                  <select aria-label="Seat passenger" className={field} value={passengerId} onChange={(e) => setPassengerId(e.target.value)}>
                    {state.passengers.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.kind})</option>)}
                  </select>
                </div>
                <div>
                  <SectionLabel>Purpose</SectionLabel>
                  <select aria-label="Seat purpose" className={field} value={purpose} onChange={(e) => setPurpose(e.target.value as Purpose)}>
                    <option value="business">Business</option>
                    <option value="personal">Personal</option>
                    <option value="entertainment">Entertainment</option>
                    <option value="commuting">Commute</option>
                  </select>
                </div>
                {(purpose === 'personal' || purpose === 'entertainment') && (
                  <p className={cn('rounded-md border px-3 py-2 text-xs', 'status-warning')}>
                    <span className="font-semibold">Tax note:</span> personal seats are imputed income to the
                    sponsoring principal (SIFL). Logged with the request.
                  </p>
                )}
                {passenger && !passenger.hasFlown && (
                  <p className="rounded-md border bg-muted/50 px-3 py-2 text-xs">
                    <span className="font-semibold">First flight:</span> {passenger.name} hasn't flown with GFO —
                    the travel form goes out automatically if the seat is approved.
                  </p>
                )}
                <Button
                  className="w-full"
                  onClick={() => { dispatch({ type: 'ASK_SEAT', flightId: askFlight.id, passengerId, purpose }); setAskingFor(null); }}
                >
                  Request seat
                </Button>
                <p className="text-xs text-muted-foreground">
                  An ask is not a hold. Seats clear at 14:00 with trip requests; a seat request never bumps one.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Pick a flight on the left.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </PortalShell>
  );
}
