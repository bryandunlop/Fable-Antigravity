// The request workspace, as a drawer over whichever queue band you came from —
// close it and you are back exactly where you were. Same move the Trip Drawer
// makes in the Command Center, and for the same reason: a scheduler working a
// ranked list must never lose their place to read one request's thread.

import { useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../../ui/sheet';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Separator } from '../../ui/separator';
import { usePortal } from '../BookingPortalContext';
import { RequestIdentityHeader } from './RequestIdentity';
import { StatusLadder, purposeLabel } from './portalUi';
import { totalEstMinutes } from '../engine/lifecycle';
import { cn } from '../../ui/utils';

export function RequestDrawer({
  requestId,
  open,
  onOpenChange,
}: {
  requestId: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { state, dispatch } = usePortal();
  const [message, setMessage] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [declining, setDeclining] = useState(false);

  const request = state.requests.find((r) => r.id === requestId);
  if (!request) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl">
          <SheetHeader><SheetTitle>Request</SheetTitle>
            <SheetDescription>This request is no longer in the queue.</SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );
  }

  const minutes = totalEstMinutes(request);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader className="space-y-3">
          <SheetTitle asChild>
            <div><RequestIdentityHeader request={request} passengers={state.passengers} /></div>
          </SheetTitle>
          <SheetDescription className="sr-only">
            Booking request {request.id} — status, manifest, and the scheduling thread.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-5">
          <div className="rounded-lg border p-3">
            <StatusLadder status={request.status} />
            {request.status === 'pending' && (
              <p className="mt-2 text-xs text-muted-foreground">
                Decision expected by <span className="font-medium text-foreground">14:00 ET</span> — today's clear.
              </p>
            )}
            {request.status === 'declined' && request.declineReason && (
              <p className="mt-2 text-sm text-muted-foreground">Declined: "{request.declineReason}"</p>
            )}
          </div>

          {/* Scheduler's decision, right where the request is read */}
          {state.persona === 'scheduling' && (request.status === 'pending' || request.status === 'approved') && (
            <div className="flex flex-wrap items-center gap-2">
              {request.status === 'pending' && !declining && (
                <>
                  <Button size="sm" onClick={() => dispatch({ type: 'APPROVE_REQUEST', id: request.id })}>Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => setDeclining(true)}>Decline…</Button>
                </>
              )}
              {request.status === 'pending' && declining && (
                <>
                  <input
                    autoFocus
                    aria-label="Decline reason"
                    className="flex-1 rounded-md border bg-background px-2.5 py-1.5 text-sm"
                    placeholder="Reason (required — it travels to the requester)"
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={!declineReason.trim()}
                    onClick={() => {
                      dispatch({ type: 'DECLINE_REQUEST', id: request.id, reason: declineReason.trim() });
                      setDeclining(false); setDeclineReason('');
                    }}
                  >
                    Decline
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setDeclining(false); setDeclineReason(''); }}>Cancel</Button>
                </>
              )}
              {request.status === 'approved' && (
                <Button size="sm" onClick={() => dispatch({ type: 'CONFIRM_REQUEST', id: request.id })}>
                  Place on schedule → Confirmed
                </Button>
              )}
            </div>
          )}

          <Separator />

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Legs &amp; manifest</p>
            <div className="space-y-3">
              {request.legs.map((leg, i) => (
                <div key={leg.id} className="overflow-hidden rounded-lg border">
                  <div className="flex flex-wrap items-center gap-2 border-b bg-muted/50 px-3 py-2">
                    <span className="text-sm font-medium">{leg.from} → {leg.to}</span>
                    <span className="text-xs text-muted-foreground">
                      {leg.date} · {leg.departLocal}{leg.flexHours > 0 ? ` · flex ±${leg.flexHours} h` : ' · firm'}
                    </span>
                    <Badge variant="outline" className="ml-auto text-[10px]">
                      est. {Math.floor(leg.estMinutes / 60)} h {leg.estMinutes % 60} m
                    </Badge>
                  </div>
                  <div className="divide-y">
                    {leg.passengers.map((lp) => {
                      const p = state.passengers.find((x) => x.id === lp.passengerId);
                      const personal = lp.purpose === 'personal' || lp.purpose === 'entertainment';
                      return (
                        <div key={lp.passengerId} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                          <span className="min-w-[110px]">{p?.name ?? lp.passengerId}</span>
                          {lp.lead && <Badge variant="secondary" className="text-[10px]">Lead</Badge>}
                          <Badge variant="outline" className={cn('text-[10px]', personal && 'status-warning')}>
                            {purposeLabel(lp.purpose)}
                          </Badge>
                          {personal && <span className="text-[11px] text-muted-foreground">SIFL — imputed income, logged</span>}
                        </div>
                      );
                    })}
                    {leg.passengers.length === 0 && (
                      <p className="px-3 py-2 text-sm text-muted-foreground">No manifest on this leg.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {Math.floor(minutes / 60)} h {minutes % 60} m estimated total
              {request.extras.length > 0 && ` · ${request.extras.join(' · ')}`}
            </p>
            {request.note && <p className="mt-1 text-xs italic text-muted-foreground">"{request.note}"</p>}
            {request.requestedTail && (
              <p className="mt-1 text-xs text-muted-foreground">
                Asked for <span className="font-medium text-foreground">{request.requestedTail}</span> from the
                fleet view — a request, not an assignment.
              </p>
            )}
          </div>

          <Separator />

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Message board — EA ↔ scheduling
            </p>
            <div className="flex flex-col gap-2.5">
              {request.messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    'max-w-[85%] rounded-lg border px-3 py-2 text-sm',
                    m.from === 'ea' ? 'self-end border-transparent bg-[color-mix(in_srgb,var(--gfo-daylight,#0096FC)_10%,transparent)]' : 'bg-muted/50',
                  )}
                >
                  <p className="mb-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {m.author} · {new Date(m.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {m.text}
                </div>
              ))}
              {request.messages.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No messages yet — rejections, resubmits, and post-lockout changes all land here.
                </p>
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                aria-label="Write a message"
                className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm"
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
              <Button
                size="sm"
                disabled={!message.trim()}
                onClick={() => { dispatch({ type: 'POST_MESSAGE', id: request.id, text: message.trim() }); setMessage(''); }}
              >
                Send
              </Button>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">Principals see outcomes, not this thread.</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
