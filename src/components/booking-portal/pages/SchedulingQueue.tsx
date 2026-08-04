// Frame D — scheduling's queue, ranked by org tier then request time
// (provisional default), cleared at a published time. Overrides and declines
// both demand a reason; requesters never see their position.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PortalShell } from '../components/PortalShell';
import { AsOf, Card, Chip, SectionLabel } from '../components/portalUi';
import { usePortal } from '../BookingPortalContext';
import { rankQueue, routeLabel } from '../engine/lifecycle';

export default function SchedulingQueue() {
  const { state, dispatch } = usePortal();
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const queue = rankQueue(state.requests);
  const approved = state.requests.filter((r) => r.status === 'approved');
  const seatAsks = state.seatAsks.filter((s) => s.status === 'requested');

  if (state.persona !== 'scheduling') {
    return (
      <PortalShell title="Booking queue">
        <p className="text-sm text-muted-foreground">The queue is scheduling's side of the portal — switch persona (top right) to work it.</p>
      </PortalShell>
    );
  }

  return (
    <PortalShell title="Booking queue · daily clear 14:00 ET" meta={<AsOf>{queue.length + seatAsks.length} pending</AsOf>}>
      <SectionLabel>Trip requests — default order: tier, then request time</SectionLabel>
      <Card className="mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2.5 w-12">Rank</th>
              <th className="px-4 py-2.5">Request</th>
              <th className="px-4 py-2.5">Requester</th>
              <th className="px-4 py-2.5 w-16">Tier</th>
              <th className="px-4 py-2.5">Requested</th>
              <th className="px-4 py-2.5 w-56"></th>
            </tr>
          </thead>
          <tbody>
            {queue.map((r, i) => {
              const principal = state.passengers.find((p) => p.id === r.principalId);
              return (
                <tr key={r.id} className="border-b border-border align-top last:border-0">
                  <td className="px-4 py-2.5 tabular-nums">{i + 1}</td>
                  <td className="px-4 py-2.5">
                    <Link to={`/booking-portal/requests/${r.id}`} className="font-semibold text-[#0077CC] dark:text-[#4FB6FD]">{r.id}</Link>
                    {' '}· {routeLabel(r)} · {r.legs[0]?.date ?? '—'}
                  </td>
                  <td className="px-4 py-2.5">{principal?.name ?? '—'} <span className="text-xs text-muted-foreground">({r.requestedBy})</span></td>
                  <td className="px-4 py-2.5">
                    <span className="inline-block w-8 bg-[#142D7E] py-0.5 text-center text-[10.5px] font-semibold text-white">T{r.tier}</span>
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{new Date(r.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="px-4 py-2.5">
                    {decliningId === r.id ? (
                      <div className="flex gap-1.5">
                        <input
                          autoFocus
                          aria-label="Decline reason"
                          className="w-44 border border-border bg-background px-2 py-1 text-xs"
                          placeholder="Reason (required)"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                        />
                        <button
                          type="button"
                          disabled={!reason.trim()}
                          onClick={() => { dispatch({ type: 'DECLINE_REQUEST', id: r.id, reason: reason.trim() }); setDecliningId(null); setReason(''); }}
                          className="border border-destructive px-2 py-1 text-xs font-semibold text-destructive disabled:opacity-40"
                        >
                          Decline
                        </button>
                        <button type="button" onClick={() => { setDecliningId(null); setReason(''); }} className="px-1 text-xs text-muted-foreground">✕</button>
                      </div>
                    ) : (
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => dispatch({ type: 'APPROVE_REQUEST', id: r.id })}
                          className="bg-[#0096FC] px-3 py-1 text-xs font-semibold text-white hover:bg-[#0077CC]"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => setDecliningId(r.id)}
                          className="border border-destructive px-3 py-1 text-xs font-semibold text-destructive"
                        >
                          Decline…
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {queue.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Queue is clear.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
      <p className="-mt-4 mb-6 text-[11px] text-muted-foreground">
        Declining requires a reason — it travels to the requester with the decision. Reordering (a logged override) is in the design; not wired in the demo.
      </p>

      {approved.length > 0 && (
        <>
          <SectionLabel>Approved — awaiting placement on the schedule</SectionLabel>
          <Card className="mb-6">
            {approved.map((r) => (
              <div key={r.id} className="flex items-center justify-between border-b border-border px-4 py-2.5 text-sm last:border-0">
                <span><span className="font-semibold">{r.id}</span> · {routeLabel(r)} · {r.legs[0]?.date}</span>
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'CONFIRM_REQUEST', id: r.id })}
                  className="border border-[#0096FC] px-3 py-1 text-xs font-semibold text-[#0077CC] dark:text-[#4FB6FD]"
                >
                  Place on schedule → Confirmed
                </button>
              </div>
            ))}
          </Card>
        </>
      )}

      <SectionLabel>Seat asks — clear with the same review</SectionLabel>
      <Card>
        {seatAsks.map((s) => {
          const flight = state.flights.find((f) => f.id === s.flightId);
          const passenger = state.passengers.find((p) => p.id === s.passengerId);
          return (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5 text-sm last:border-0">
              <span>
                {passenger?.name ?? '—'} · {flight ? `${flight.from} → ${flight.to} · ${flight.date}` : '—'}
                {' '}<Chip tone={s.purpose === 'business' ? 'info' : 'flag'}>{s.purpose}</Chip>
                {s.firstFlight && <Chip tone="neutral" className="ml-1.5">first flight — form auto-sends</Chip>}
              </span>
              <div className="flex gap-1.5">
                <button type="button" onClick={() => dispatch({ type: 'DECIDE_SEAT', id: s.id, approve: true })} className="bg-[#0096FC] px-3 py-1 text-xs font-semibold text-white">Confirm seat</button>
                <button type="button" onClick={() => dispatch({ type: 'DECIDE_SEAT', id: s.id, approve: false })} className="border border-destructive px-3 py-1 text-xs font-semibold text-destructive">Don't clear</button>
              </div>
            </div>
          );
        })}
        {seatAsks.length === 0 && <p className="px-4 py-6 text-center text-sm text-muted-foreground">No seat asks pending.</p>}
      </Card>
    </PortalShell>
  );
}
