// Frame F — watches: fleet-date holds and route-seat watches on one
// mechanism. A watch reserves nothing; when the thing you are watching frees,
// one click opens a pre-filled request. "Simulate: frees up" stands in for the
// mirror noticing a cancellation.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { PortalShell } from '../components/PortalShell';
import { AsOf, Chip, SectionLabel } from '../components/portalUi';
import { usePortal } from '../BookingPortalContext';
import { cn } from '../../ui/utils';

export default function Watches() {
  const { state, dispatch } = usePortal();
  const navigate = useNavigate();
  const [kind, setKind] = useState<'fleet' | 'route'>('fleet');
  const [dates, setDates] = useState('');
  const [detailField, setDetailField] = useState('');

  const asOf = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const active = state.watches.filter((w) => w.status !== 'expired');
  const field = 'w-full rounded-md border bg-background px-2.5 py-1.5 text-sm';

  const create = () => {
    const label = kind === 'fleet'
      ? `Fleet hold · ${dates || 'dates TBD'}${detailField ? ` · ${detailField} pax` : ''}`
      : `Seat watch · ${detailField || 'route TBD'} · ${dates || 'window TBD'}`;
    dispatch({
      type: 'CREATE_WATCH',
      kind,
      label,
      detail: kind === 'fleet'
        ? 'Watching for any aircraft free across the window.'
        : 'Alerts you if a seat opens on any eligible flight matching route + window.',
    });
    setDates(''); setDetailField('');
  };

  return (
    <PortalShell title="Watches" meta={<AsOf>{active.length} active · fleet state as of {asOf}</AsOf>}>
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="flex flex-wrap items-center gap-2.5 text-base">
              <span className="status-badge status-info p-1.5"><Bell className="h-4 w-4" /></span>
              Availability watches
              <Badge variant={active.length ? 'secondary' : 'outline'}>{active.length}</Badge>
              <span className="text-xs font-normal text-muted-foreground">a watch never holds an aircraft or a seat</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 pt-0">
            {state.watches.map((w) => (
              <div
                key={w.id}
                className={cn(
                  'flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3',
                  w.status === 'freed' && 'border-l-[3px] border-l-[var(--gfo-sunrise,#D1AC6B)]',
                  w.status === 'expired' && 'opacity-60',
                )}
              >
                <span className="flex min-w-0 items-center gap-3">
                  {w.status === 'watching' && <Chip tone="info">Watching</Chip>}
                  {w.status === 'freed' && <Chip tone="gold">Freed</Chip>}
                  {w.status === 'expired' && <Chip tone="neutral">Expired</Chip>}
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{w.label}</span>
                    <span className="block text-xs text-muted-foreground">
                      {w.status === 'freed' ? w.freedNote : w.detail}
                    </span>
                  </span>
                </span>
                <span className="flex shrink-0 gap-2">
                  {w.status === 'watching' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => dispatch({ type: 'SIMULATE_FREE', id: w.id })}
                        title="Demo control — stands in for the mirror noticing a cancellation"
                      >
                        Simulate: frees up
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'CANCEL_WATCH', id: w.id })}>
                        Cancel
                      </Button>
                    </>
                  )}
                  {w.status === 'freed' && !w.prefillRequestId && (
                    <Button size="sm" onClick={() => navigate('/booking-portal/requests/new', { state: { fromWatchId: w.id } })}>
                      Open pre-filled request
                    </Button>
                  )}
                  {w.status === 'freed' && w.prefillRequestId && <Chip tone="info">Requested — {w.prefillRequestId}</Chip>}
                </span>
              </div>
            ))}
            {state.watches.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">No watches yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader className="py-4"><CardTitle className="text-base">New watch</CardTitle></CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="flex gap-1.5">
              <Button variant={kind === 'fleet' ? 'secondary' : 'outline'} size="sm" onClick={() => setKind('fleet')}>
                Fleet dates
              </Button>
              <Button variant={kind === 'route' ? 'secondary' : 'outline'} size="sm" onClick={() => setKind('route')}>
                Route seat
              </Button>
            </div>
            <div>
              <SectionLabel>{kind === 'fleet' ? 'Dates' : 'Window'}</SectionLabel>
              <input aria-label="Watch dates" className={field} placeholder="Sep 2 – Sep 4" value={dates} onChange={(e) => setDates(e.target.value)} />
            </div>
            <div>
              <SectionLabel>{kind === 'fleet' ? 'Passengers' : 'Route'}</SectionLabel>
              <input
                aria-label="Watch detail"
                className={field}
                placeholder={kind === 'fleet' ? '3' : 'KCVG → KTEB'}
                value={detailField}
                onChange={(e) => setDetailField(e.target.value)}
              />
            </div>
            <Button className="w-full" onClick={create}>Start watching</Button>
            <p className="text-xs text-muted-foreground">
              Advisory only, and it expires with its window — no zombie alerts.
            </p>
          </CardContent>
        </Card>
      </div>
    </PortalShell>
  );
}
