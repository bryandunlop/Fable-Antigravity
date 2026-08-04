// Frame C — request detail: the status ladder, the per-request EA↔scheduling
// message board (rejection reasons and resubmits live here), and the decline →
// resubmit path.

import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PortalShell } from '../components/PortalShell';
import { Card, Chip, SectionLabel, StatusLadder, purposeLabel } from '../components/portalUi';
import { usePortal } from '../BookingPortalContext';
import { routeLabel, totalEstMinutes } from '../engine/lifecycle';
import { cn } from '../../ui/utils';

export default function RequestDetail() {
  const { id } = useParams();
  const { state, dispatch } = usePortal();
  const [message, setMessage] = useState('');
  const request = state.requests.find((r) => r.id === id);

  if (!request) {
    return (
      <PortalShell title="Request not found">
        <p className="text-sm text-muted-foreground">
          No request with that id. <Link className="text-[#0077CC] dark:text-[#4FB6FD]" to="/booking-portal/requests">Back to requests</Link>
        </p>
      </PortalShell>
    );
  }

  const minutes = totalEstMinutes(request);
  const dates = request.legs.length
    ? `${request.legs[0].date}${request.legs.length > 1 ? ` – ${request.legs[request.legs.length - 1].date}` : ''}`
    : '';

  return (
    <PortalShell title={`${request.id} · ${routeLabel(request)} · ${dates}`}>
      <Card className="mb-5 p-4">
        <StatusLadder status={request.status} />
        {request.status === 'pending' && (
          <p className="mt-2.5 text-xs text-muted-foreground">
            Decision expected by <span className="font-semibold text-foreground">14:00 ET</span> — scheduling clears the queue daily.
          </p>
        )}
        {request.status === 'declined' && request.declineReason && (
          <div className="mt-3 border-t border-border pt-3">
            <p className="text-sm text-muted-foreground">"{request.declineReason}"</p>
            <button
              type="button"
              onClick={() => dispatch({ type: 'RESUBMIT_REQUEST', id: request.id })}
              className="mt-2 border border-[#0096FC] px-3 py-1.5 text-xs font-semibold text-[#0077CC] dark:text-[#4FB6FD]"
            >
              Edit & resubmit
            </button>
            <p className="mt-1.5 text-[11px] text-muted-foreground">Resubmit reopens this same request, not a new one.</p>
          </div>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <Card className="p-4">
          <SectionLabel>Message board — EA ↔ scheduling</SectionLabel>
          <div className="flex flex-col gap-2.5">
            {request.messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  'max-w-[80%] border px-3 py-2 text-sm',
                  m.from === 'ea' ? 'self-end border-transparent bg-[#0096FC]/10' : 'border-border bg-muted/50',
                )}
              >
                <p className="mb-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {m.author} · {new Date(m.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                {m.text}
              </div>
            ))}
            {request.messages.length === 0 && (
              <p className="text-sm text-muted-foreground">No messages yet — rejections, resubmits, and post-lockout changes all land here.</p>
            )}
          </div>
          <div className="mt-3 flex gap-2 border-t border-border pt-3">
            <input
              aria-label="Write a message"
              className="flex-1 border border-border bg-background px-3 py-1.5 text-sm"
              placeholder={`Write as ${state.persona === 'ea' ? 'Dana (EA)' : 'scheduling'}…`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && message.trim()) {
                  dispatch({ type: 'POST_MESSAGE', id: request.id, text: message.trim() });
                  setMessage('');
                }
              }}
            />
            <button
              type="button"
              disabled={!message.trim()}
              onClick={() => { dispatch({ type: 'POST_MESSAGE', id: request.id, text: message.trim() }); setMessage(''); }}
              className="bg-[#0096FC] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
            >
              Send
            </button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">Principals see outcomes, not this thread.</p>
        </Card>

        <div className="flex flex-col gap-4">
          {request.legs.map((leg, i) => (
            <Card key={leg.id} className="p-4">
              <SectionLabel>Leg {i + 1} · {leg.date}</SectionLabel>
              <p className="text-sm font-semibold">{leg.from} → {leg.to} · {leg.departLocal}{leg.flexHours > 0 ? ` · flex ±${leg.flexHours} h` : ' · firm'}</p>
              <table className="mt-2 w-full text-xs">
                <tbody>
                  {leg.passengers.map((lp) => {
                    const p = state.passengers.find((x) => x.id === lp.passengerId);
                    return (
                      <tr key={lp.passengerId} className="border-t border-border">
                        <td className="py-1.5">{p?.name ?? lp.passengerId}</td>
                        <td className="py-1.5">{lp.lead && <Chip tone="gold">Lead</Chip>}</td>
                        <td className="py-1.5"><Chip tone={lp.purpose === 'business' ? 'info' : 'neutral'}>{purposeLabel(lp.purpose)}</Chip></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          ))}
          <Card className="p-4 text-sm">
            <SectionLabel>Summary</SectionLabel>
            <p><span className="font-semibold">{Math.floor(minutes / 60)} h {minutes % 60} m</span> est. total · requested by {request.requestedBy}</p>
            {request.extras.length > 0 && <p className="mt-1 text-muted-foreground">{request.extras.join(' · ')}</p>}
            {request.note && <p className="mt-1 text-muted-foreground">"{request.note}"</p>}
          </Card>
        </div>
      </div>
    </PortalShell>
  );
}
