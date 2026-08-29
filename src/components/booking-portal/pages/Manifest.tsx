// Filling the manifest, weeks after the booking (D100, 2026-08-29).
//
// This is the EA's real workload and the portal had no screen for it: names
// arrive in bits, guests forget their travel forms, a passport lapses between
// the request and the return leg. One screen per trip — the seats, who owes
// what, one button that chases them, and a plain statement of what happens if
// she does nothing. Everything derived by engine/manifest; nothing decided here.

import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Bell, FileText, Link2, UserPlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { PortalShell } from '../components/PortalShell';
import { Chip, SectionLabel, purposeLabel } from '../components/portalUi';
import { usePortal } from '../BookingPortalContext';
import { manifestState, consequencesOfSilence, type Outstanding } from '../engine/manifest';
import { routeLabel } from '../engine/lifecycle';
import type { Purpose } from '../types';
import { cn } from '../../ui/utils';

const PURPOSES: Purpose[] = ['business', 'personal', 'entertainment', 'commuting'];

function initials(name: string): string {
  return name.split(/[\s.]+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

function hoursLabel(hours: number): string {
  if (!Number.isFinite(hours)) return '—';
  if (hours <= 0) return 'locked';
  if (hours < 48) return `${Math.round(hours)} h`;
  return `${Math.round(hours / 24)} days`;
}

export default function ManifestPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, dispatch } = usePortal();
  const [adding, setAdding] = useState(false);
  const [addId, setAddId] = useState('');
  const [addPurpose, setAddPurpose] = useState<Purpose>('business');

  const request = state.requests.find((r) => r.id === id);

  if (!request) {
    return (
      <PortalShell title="Manifest">
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
          That trip is no longer in the portal.
        </CardContent></Card>
      </PortalShell>
    );
  }

  const m = useMemo(() => manifestState(request, state.passengers, Date.now()), [request, state.passengers]);
  const consequences = useMemo(() => consequencesOfSilence(m), [m]);
  const namedIds = new Set(m.named.map((s) => s.passengerId));
  const addable = state.passengers.filter((p) => !namedIds.has(p.id));

  const outstandingFor = (passengerId: string): Outstanding[] =>
    m.outstanding.filter((o) => o.passengerId === passengerId);

  const legLabel = (legId: string) => {
    const leg = request.legs.find((l) => l.id === legId);
    return leg ? `${leg.from} → ${leg.to}` : 'that leg';
  };

  return (
    <PortalShell
      title={`Manifest — ${routeLabel(request)}`}
      meta={
        <span className="text-sm text-muted-foreground">
          {request.legs[0]?.date} · {m.seatsHeld} seat{m.seatsHeld === 1 ? '' : 's'} held ·{' '}
          {m.named.length} named
        </span>
      }
      actions={
        <Button variant="outline" size="sm" onClick={() => navigate('/booking-portal/trips')}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Trips
        </Button>
      }
    >
      <div className="flex flex-col gap-4">

        {/* The clock, stated once */}
        <Card>
          <CardContent className="flex flex-wrap items-center gap-4 p-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg font-semibold text-primary">{routeLabel(request)}</span>
                {m.international && <Chip tone="neutral">International</Chip>}
                {m.locked && <Chip tone="block">Locked</Chip>}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {m.named.length} of {m.seatsHeld} seats named
                {m.unnamedSeats > 0 && ` · ${m.unnamedSeats} still open`}
              </p>
            </div>
            <div className="text-right">
              <SectionLabel>{m.locked ? 'Manifest' : 'Locks in'}</SectionLabel>
              <div className="gfo-numeric text-3xl text-primary">{hoursLabel(m.hoursToLock)}</div>
              <p className="text-xs text-muted-foreground">
                {m.lockHours} h before departure — {m.international ? 'international' : 'domestic'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* One chase for everything outstanding */}
        {m.outstanding.length > 0 && !m.locked && (
          <Card className="border-l-[3px] border-l-[var(--gfo-sunrise,#D1AC6B)]">
            <CardContent className="flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {m.outstanding.length === 1
                    ? 'One person owes you something'
                    : `${new Set(m.outstanding.map((o) => o.passengerId)).size} people owe you something`}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {m.outstanding.map((o) => `${o.name} — ${o.detail}`).join(' · ')}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() =>
                  dispatch({
                    type: 'CHASE_OUTSTANDING',
                    requestId: request.id,
                    names: Array.from(new Set(m.outstanding.map((o) => o.name))),
                  })
                }
              >
                <Bell className="mr-1.5 h-4 w-4" />
                Chase {m.outstanding.length === 1 ? 'them' : 'all'}
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 lg:grid-cols-[1fr_300px]">

          {/* Seats */}
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="flex flex-wrap items-baseline justify-between gap-2 text-base">
                <span>Seats · {m.named.length} of {m.seatsHeld} named</span>
                <span className="text-xs font-normal text-muted-foreground">
                  On every leg unless you drop them from one
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {m.named.map((seat) => {
                const problems = outstandingFor(seat.passengerId);
                const blocked = problems.find((p) => p.kind === 'document');
                const form = problems.find((p) => p.kind === 'form');
                const purpose = request.legs
                  .flatMap((l) => l.passengers)
                  .find((p) => p.passengerId === seat.passengerId)?.purpose ?? 'business';
                return (
                  <div
                    key={seat.passengerId}
                    className={cn(
                      'flex flex-wrap items-center gap-3 rounded-lg border p-3',
                      blocked && 'border-destructive/30 bg-destructive/5',
                      !blocked && form && 'border-[color-mix(in_srgb,var(--gfo-warning,#F1B434)_45%,transparent)] bg-[color-mix(in_srgb,var(--gfo-warning,#F1B434)_6%,transparent)]',
                      !blocked && !form && seat.lead && 'border-[color-mix(in_srgb,var(--gfo-daylight,#0096FC)_30%,transparent)] bg-[color-mix(in_srgb,var(--gfo-daylight,#0096FC)_5%,transparent)]',
                    )}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-primary">
                      {initials(seat.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{seat.name}</span>
                        {seat.lead && <Chip tone="info">Lead</Chip>}
                        <Chip tone="neutral">{seat.kind}</Chip>
                        <Chip tone={purpose === 'business' || purpose === 'commuting' ? 'neutral' : 'flag'}>
                          {purposeLabel(purpose)}
                        </Chip>
                        {blocked && <Chip tone="block">
                          Cannot fly {blocked.blockedLegIds.length === 1 ? legLabel(blocked.blockedLegIds[0]) : 'some legs'}
                        </Chip>}
                        {form && !blocked && <Chip tone="flag">Form not returned</Chip>}
                      </div>
                      <p className={cn('mt-0.5 text-xs', blocked ? 'text-destructive' : 'text-muted-foreground')}>
                        {blocked?.detail ?? form?.detail ?? `On ${seat.legIds.length} of ${request.legs.length} legs`}
                      </p>
                    </div>
                    {form && !m.locked && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => dispatch({ type: 'CHASE_OUTSTANDING', requestId: request.id, names: [seat.name] })}>
                          <Bell className="mr-1.5 h-3.5 w-3.5" /> Remind
                        </Button>
                        <Button variant="outline" size="sm"><Link2 className="mr-1.5 h-3.5 w-3.5" /> Copy link</Button>
                      </>
                    )}
                    {blocked && !m.locked && blocked.blockedLegIds.map((legId) => (
                      <Button
                        key={legId}
                        variant="outline"
                        size="sm"
                        onClick={() => dispatch({ type: 'DROP_FROM_LEG', requestId: request.id, passengerId: seat.passengerId, legId })}
                      >
                        Drop from {legLabel(legId)}
                      </Button>
                    ))}
                  </div>
                );
              })}

              {/* Unnamed seats — honest, not an error */}
              {m.unnamedSeats > 0 && !m.locked && (
                <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed bg-muted/30 p-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed text-[11px] font-semibold text-muted-foreground">
                    {m.unnamedSeats}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-muted-foreground">
                      {m.unnamedSeats === 1 ? 'One seat still open' : `${m.unnamedSeats} seats still open`}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Name them any time before the lock, or release them back to the fleet
                    </p>
                  </div>
                  <Button size="sm" onClick={() => setAdding((v) => !v)}>
                    <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Add someone
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => dispatch({ type: 'RELEASE_HELD_SEAT', requestId: request.id })}>
                    Release a seat
                  </Button>
                </div>
              )}

              {adding && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
                  <select
                    aria-label="Passenger to add"
                    className="rounded-md border bg-background px-2.5 py-1.5 text-sm"
                    value={addId}
                    onChange={(e) => setAddId(e.target.value)}
                  >
                    <option value="">Choose someone…</option>
                    {addable.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <select
                    aria-label="Purpose"
                    className="rounded-md border bg-background px-2.5 py-1.5 text-sm"
                    value={addPurpose}
                    onChange={(e) => setAddPurpose(e.target.value as Purpose)}
                  >
                    {PURPOSES.map((pu) => <option key={pu} value={pu}>{purposeLabel(pu)}</option>)}
                  </select>
                  <Button
                    size="sm"
                    disabled={!addId}
                    onClick={() => {
                      dispatch({ type: 'NAME_SEAT', requestId: request.id, passengerId: addId, purpose: addPurpose });
                      setAddId('');
                      setAdding(false);
                    }}
                  >
                    Add to the trip
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>Cancel</Button>
                </div>
              )}

              {m.locked && (
                <p className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                  The manifest is locked. Changes now go through scheduling — use the trip's thread.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Forms + consequences */}
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader className="py-4"><CardTitle className="text-base">Forms</CardTitle></CardHeader>
              <CardContent className="space-y-2 pt-0">
                {m.named.map((seat) => {
                  const problems = outstandingFor(seat.passengerId);
                  const tone = problems.some((p) => p.kind === 'document')
                    ? 'bg-destructive'
                    : problems.some((p) => p.kind === 'form')
                      ? 'bg-[var(--gfo-warning,#F1B434)]'
                      : 'bg-[var(--gfo-success,#00B140)]';
                  const label = problems.some((p) => p.kind === 'document')
                    ? 'Document'
                    : problems.some((p) => p.kind === 'form')
                      ? 'Waiting'
                      : 'Current';
                  return (
                    <div key={seat.passengerId} className="flex items-center gap-2 text-sm">
                      <span className={cn('h-2 w-2 shrink-0 rounded-full', tone)} />
                      <span className="min-w-0 flex-1 truncate">{seat.name}</span>
                      <span className="text-xs text-muted-foreground">{label}</span>
                    </div>
                  );
                })}
                {m.named.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nobody named yet.</p>
                )}
                <Button variant="outline" size="sm" className="mt-1 w-full" onClick={() => navigate('/booking-portal/passengers')}>
                  <FileText className="mr-1.5 h-3.5 w-3.5" /> Open passengers
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  If you do nothing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {consequences.map((line) => <li key={line}>{line}</li>)}
                </ul>
                {!m.locked && (
                  <p className="border-t pt-2 text-xs text-muted-foreground">
                    We'll remind you at 5 days, 3 days and 24 hours.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PortalShell>
  );
}
