// The scheduling side, in the Command Center's language: a funnel summary over
// the horizon, urgency bands as cards, request clusters you can act on in
// place, and a drawer so reading one request never costs you your place in the
// ranked list.
//
// Banding is presentation. The policy underneath is unchanged — org tier, then
// request time — and "Departing soon" only lifts a band, it does not reorder
// within one.

import { useState } from 'react';
import {
  AlertTriangle, CalendarClock, CheckCircle2, ChevronRight, Inbox, ListChecks, Plane, Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { PortalShell } from '../components/PortalShell';
import { RequestDrawer } from '../components/RequestDrawer';
import { RequestIdentityLine } from '../components/RequestIdentity';
import { AsOf } from '../components/portalUi';
import { usePortal } from '../BookingPortalContext';
import { buildQueue, overallRank, type QueueBand } from '../engine/queueBands';
import type { TripRequest } from '../types';
import { cn } from '../../ui/utils';

const BAND_META: Record<Exclude<QueueBand, 'seat-asks'>, { label: string; hint: string; icon: React.ElementType; accent: string }> = {
  'departing-soon': { label: 'Departing soon', hint: 'inside 7 days — decide these first', icon: AlertTriangle, accent: 'status-error' },
  pending: { label: "Today's clear", hint: 'ranked by tier, then request time', icon: ListChecks, accent: 'status-warning' },
  'awaiting-placement': { label: 'Approved — awaiting placement', hint: 'approved is a decision; confirmed is a schedule', icon: CalendarClock, accent: 'status-info' },
};
const BAND_ORDER: Exclude<QueueBand, 'seat-asks'>[] = ['departing-soon', 'pending', 'awaiting-placement'];

type Filter = 't1' | 't2' | 't3';

export default function SchedulingQueue() {
  const { state, dispatch } = usePortal();
  const [filters, setFilters] = useState<Set<Filter>>(new Set());
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const model = buildQueue(state.requests, state.seatAsks, Date.now());

  if (state.persona !== 'scheduling') {
    return (
      <PortalShell title="Booking queue">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-muted-foreground">
            <Users className="h-10 w-10 opacity-40" />
            <p className="font-medium">The queue is scheduling's side of the portal.</p>
            <p className="text-sm">Switch persona at the top right to work it.</p>
          </CardContent>
        </Card>
      </PortalShell>
    );
  }

  const toggle = (f: Filter) =>
    setFilters((prev) => { const s = new Set(prev); s.has(f) ? s.delete(f) : s.add(f); return s; });
  const matches = (r: TripRequest) => filters.size === 0 || filters.has(`t${r.tier}` as Filter);

  const chips: { key: Filter; label: string; count: number; dot: string }[] = [
    { key: 't1', label: 'Tier 1', count: model.tiers.t1, dot: 'bg-[var(--gfo-error,#EF3340)]' },
    { key: 't2', label: 'Tier 2', count: model.tiers.t2, dot: 'bg-[var(--gfo-warning,#F1B434)]' },
    { key: 't3', label: 'Tier 3', count: model.tiers.t3, dot: 'bg-muted-foreground/40' },
  ];

  const shown = BAND_ORDER.map((b) => ({ band: b, rows: model.bands[b].filter(matches) }));
  const totalShown = shown.reduce((n, s) => n + s.rows.length, 0) + model.seatAsks.length;

  return (
    <PortalShell
      title="Booking queue"
      meta={<AsOf>{model.counts.total} decision{model.counts.total === 1 ? '' : 's'} waiting · daily clear 14:00 ET</AsOf>}
    >
      <div className="flex flex-col gap-4">
        {/* Funnel over the queue — chips filter the bands below */}
        <Card>
          <CardContent className="flex flex-wrap items-center gap-2.5 p-4">
            <span className="mr-1 text-xs font-medium text-muted-foreground">
              {model.counts.pending} pending · {model.counts.approved} approved · {model.counts.seatAsks} seat ask{model.counts.seatAsks === 1 ? '' : 's'}
            </span>
            {chips.map((c) => (
              <button
                key={c.key}
                onClick={() => toggle(c.key)}
                className={cn(
                  'flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                  filters.has(c.key) ? 'border-foreground bg-foreground text-background' : 'bg-background text-foreground hover:bg-accent',
                )}
              >
                <span className={cn('h-2 w-2 rounded-full', c.dot)} />
                {c.label}
                <span className={filters.has(c.key) ? 'opacity-80' : 'text-muted-foreground'}>{c.count}</span>
              </button>
            ))}
          </CardContent>
        </Card>

        {shown.map(({ band, rows }) => {
          const meta = BAND_META[band];
          const Icon = meta.icon;
          const awaiting = band === 'awaiting-placement';
          return (
            <Card key={band}>
              <CardHeader className="py-4">
                <CardTitle className="flex flex-wrap items-center gap-2.5 text-base">
                  <span className={cn('status-badge p-1.5', meta.accent)}><Icon className="h-4 w-4" /></span>
                  {meta.label}
                  <Badge variant={rows.length ? 'secondary' : 'outline'}>{rows.length}</Badge>
                  <span className="text-xs font-normal text-muted-foreground">{meta.hint}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nothing here.</p>
                ) : (
                  rows.map((r) => (
                    <div key={r.id} className="overflow-hidden rounded-lg border">
                      <button
                        onClick={() => setDrawerId(r.id)}
                        className="group flex w-full items-center justify-between gap-3 border-b bg-muted/50 px-4 py-2.5 text-left transition-colors hover:bg-accent"
                      >
                        <span className="flex min-w-0 items-center gap-2.5">
                          {!awaiting && (
                            <span className="w-5 shrink-0 text-center text-xs font-semibold tabular-nums text-muted-foreground">
                              {overallRank(model, r)}
                            </span>
                          )}
                          <RequestIdentityLine request={r} passengers={state.passengers} />
                        </span>
                        <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground">
                          Open <ChevronRight className="h-3.5 w-3.5" />
                        </span>
                      </button>
                      <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                        {awaiting ? (
                          <Button size="sm" onClick={() => dispatch({ type: 'CONFIRM_REQUEST', id: r.id })}>
                            Place on schedule → Confirmed
                          </Button>
                        ) : decliningId === r.id ? (
                          <>
                            <input
                              autoFocus
                              aria-label="Decline reason"
                              className="min-w-[220px] flex-1 rounded-md border bg-background px-2.5 py-1.5 text-sm"
                              placeholder="Reason (required — it travels to the requester)"
                              value={reason}
                              onChange={(e) => setReason(e.target.value)}
                            />
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={!reason.trim()}
                              onClick={() => { dispatch({ type: 'DECLINE_REQUEST', id: r.id, reason: reason.trim() }); setDecliningId(null); setReason(''); }}
                            >
                              Decline
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => { setDecliningId(null); setReason(''); }}>Cancel</Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" onClick={() => dispatch({ type: 'APPROVE_REQUEST', id: r.id })}>Approve</Button>
                            <Button size="sm" variant="outline" onClick={() => setDecliningId(r.id)}>Decline…</Button>
                            {r.note && <span className="text-xs italic text-muted-foreground">"{r.note}"</span>}
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}

        {/* Seat asks clear with the same review, but never bump a trip request */}
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="flex flex-wrap items-center gap-2.5 text-base">
              <span className="status-badge status-info p-1.5"><Plane className="h-4 w-4" /></span>
              Seat asks
              <Badge variant={model.seatAsks.length ? 'secondary' : 'outline'}>{model.seatAsks.length}</Badge>
              <span className="text-xs font-normal text-muted-foreground">clear with the same review — never bump a trip request</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {model.seatAsks.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing here.</p>
            ) : (
              model.seatAsks.map((s) => {
                const flight = state.flights.find((f) => f.id === s.flightId);
                const passenger = state.passengers.find((p) => p.id === s.passengerId);
                const personal = s.purpose === 'personal' || s.purpose === 'entertainment';
                return (
                  <div key={s.id} className="flex flex-wrap items-center gap-2 rounded-lg border px-4 py-2.5 text-sm">
                    <span className="font-medium">{passenger?.name ?? '—'}</span>
                    <span className="text-muted-foreground">
                      {flight ? `${flight.from} → ${flight.to} · ${flight.date}` : '—'}
                    </span>
                    <Badge variant="outline" className={cn('text-[10px]', personal && 'status-warning')}>{s.purpose}</Badge>
                    {personal && <span className="text-[11px] text-muted-foreground">SIFL logged</span>}
                    {s.firstFlight && <Badge variant="outline" className="text-[10px]">first flight — form auto-sends</Badge>}
                    <span className="ml-auto flex gap-2">
                      <Button size="sm" onClick={() => dispatch({ type: 'DECIDE_SEAT', id: s.id, approve: true })}>Confirm seat</Button>
                      <Button size="sm" variant="outline" onClick={() => dispatch({ type: 'DECIDE_SEAT', id: s.id, approve: false })}>Don't clear</Button>
                    </span>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {totalShown === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-12 text-muted-foreground">
              {model.counts.total === 0 ? (
                <Inbox className="h-10 w-10 opacity-40" />
              ) : (
                <CheckCircle2 className="h-10 w-10 text-[var(--gfo-success,#00B140)] opacity-60" />
              )}
              <p className="font-medium">
                {model.counts.total === 0 ? 'Queue is clear — nothing waiting.' : 'Nothing matches those tier filters.'}
              </p>
            </CardContent>
          </Card>
        )}

        <p className="text-[11px] text-muted-foreground">
          Reordering within a band is a logged override — in the design, not wired in the demo.
          Requesters see "decision by 14:00", never their rank or who else is in line.
        </p>
      </div>

      <RequestDrawer requestId={drawerId} open={!!drawerId} onOpenChange={(o) => { if (!o) setDrawerId(null); }} />
    </PortalShell>
  );
}
