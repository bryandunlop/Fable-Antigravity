// Frame G — empty seats: browse under the same eligibility projection as the
// calendar, ask for a seat, and watch the ask ride the 14:00 clear. A seat
// always rides someone else's trip; the caveat travels with it.

import { useState } from 'react';
import { PortalShell } from '../components/PortalShell';
import { AsOf, Card, Chip, SectionLabel } from '../components/portalUi';
import { usePortal } from '../BookingPortalContext';
import type { Purpose } from '../types';
import { cn } from '../../ui/utils';

export default function EmptySeats() {
  const { state, dispatch } = usePortal();
  const [askingFor, setAskingFor] = useState<string | null>(null);
  const [passengerId, setPassengerId] = useState('P-TANAKA');
  const [purpose, setPurpose] = useState<Purpose>('business');

  const open = state.flights.filter((f) => f.seatsOpen > 0 || state.seatAsks.some((s) => s.flightId === f.id && s.status !== 'withdrawn'));
  const asOf = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const passenger = state.passengers.find((p) => p.id === passengerId);
  const askFlight = state.flights.find((f) => f.id === askingFor);

  return (
    <PortalShell title="Empty seats · next 30 days" meta={<AsOf>Seats as of {asOf} · advisory</AsOf>}>
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-3">
          {open.map((f) => {
            const asks = state.seatAsks.filter((s) => s.flightId === f.id && s.status !== 'withdrawn');
            return (
              <Card key={f.id} className={cn('flex flex-wrap items-center justify-between gap-3 p-4', asks.some((a) => a.status === 'confirmed') && 'border-l-[3px] border-l-[#00B140]')}>
                <div>
                  <p className="text-sm font-semibold">{f.from} → {f.to} · {f.date} · {f.depart} – {f.arrive} · {f.aircraft}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {f.seatsOpen > 0 && <span className="font-semibold text-[#008130] dark:text-[#34C46A]">{f.seatsOpen} seat{f.seatsOpen === 1 ? '' : 's'} open</span>}
                    {f.seatsOpen > 0 && ' · '}rides on a scheduled trip · subject to change until departure
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {asks.map((s) => {
                      const p = state.passengers.find((x) => x.id === s.passengerId);
                      return (
                        <span key={s.id} className="flex items-center gap-1.5 text-xs">
                          {s.status === 'requested' && <Chip tone="info">Seat requested — decision by 14:00</Chip>}
                          {s.status === 'confirmed' && <Chip tone="ok">Seat confirmed</Chip>}
                          {s.status === 'released' && <Chip tone="neutral">Released</Chip>}
                          {s.status === 'reconfirm' && <Chip tone="flag">Flight changed — reconfirm</Chip>}
                          {p?.name}
                          {s.status === 'requested' && (
                            <button type="button" className="text-muted-foreground underline" onClick={() => dispatch({ type: 'WITHDRAW_SEAT', id: s.id })}>withdraw</button>
                          )}
                          {s.status === 'confirmed' && (
                            <button type="button" className="text-muted-foreground underline" onClick={() => dispatch({ type: 'RELEASE_SEAT', id: s.id })}>release</button>
                          )}
                        </span>
                      );
                    })}
                  </div>
                </div>
                {f.seatsOpen > 0 && (
                  <button
                    type="button"
                    onClick={() => setAskingFor(f.id)}
                    className="border border-[#0096FC] px-3 py-1.5 text-xs font-semibold text-[#0077CC] dark:text-[#4FB6FD]"
                  >
                    Ask for a seat
                  </button>
                )}
              </Card>
            );
          })}
          {open.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">No open seats in the window.</Card>}
          <p className="text-[11px] text-muted-foreground">
            Same confidentiality projection as the calendar — no manifest, no trip owner on flights you're not part of.
            A withdrawn or released seat goes back to the pool at the next clear.
          </p>
        </div>

        <Card className="h-fit p-4">
          <SectionLabel>Ask for a seat</SectionLabel>
          {askFlight ? (
            <>
              <p className="mb-2 text-sm font-semibold">{askFlight.from} → {askFlight.to} · {askFlight.date}</p>
              <label className="mb-1 block text-xs text-muted-foreground">Passenger</label>
              <select aria-label="Seat passenger" className="mb-2 w-full border border-border bg-background px-2 py-1.5 text-sm" value={passengerId} onChange={(e) => setPassengerId(e.target.value)}>
                {state.passengers.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.kind})</option>)}
              </select>
              <label className="mb-1 block text-xs text-muted-foreground">Purpose</label>
              <select aria-label="Seat purpose" className="mb-2 w-full border border-border bg-background px-2 py-1.5 text-sm" value={purpose} onChange={(e) => setPurpose(e.target.value as Purpose)}>
                <option value="business">Business</option>
                <option value="personal">Personal</option>
                <option value="entertainment">Entertainment</option>
                <option value="commuting">Commute</option>
              </select>
              {(purpose === 'personal' || purpose === 'entertainment') && (
                <p className="mb-2 bg-[#F1B434]/15 px-2.5 py-2 text-xs">
                  <span className="font-semibold">Tax note:</span> personal seats are imputed income to the sponsoring principal (SIFL). Logged with the request.
                </p>
              )}
              {passenger && !passenger.hasFlown && (
                <p className="mb-2 bg-muted px-2.5 py-2 text-xs">
                  <span className="font-semibold">First flight:</span> {passenger.name} hasn't flown with GFO — the travel form goes out automatically if the seat is approved.
                </p>
              )}
              <button
                type="button"
                onClick={() => { dispatch({ type: 'ASK_SEAT', flightId: askFlight.id, passengerId, purpose }); setAskingFor(null); }}
                className="w-full bg-[#0096FC] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0077CC]"
              >
                Request seat
              </button>
              <p className="mt-2 text-[11px] text-muted-foreground">
                An ask is not a hold. Seats clear at 14:00 with trip requests; a seat request never bumps a trip request.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Pick a flight on the left.</p>
          )}
        </Card>
      </div>
    </PortalShell>
  );
}
