// Frame F — watches: fleet-date holds and route-seat watches on one
// mechanism. A watch reserves nothing; when it frees, one click opens a
// pre-filled request. "Simulate: aircraft frees up" stands in for the mirror
// noticing a cancellation.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PortalShell } from '../components/PortalShell';
import { AsOf, Card, Chip, SectionLabel } from '../components/portalUi';
import { usePortal } from '../BookingPortalContext';
import { cn } from '../../ui/utils';

export default function Watches() {
  const { state, dispatch } = usePortal();
  const navigate = useNavigate();
  const [kind, setKind] = useState<'fleet' | 'route'>('fleet');
  const [dates, setDates] = useState('');
  const [detailField, setDetailField] = useState('');

  const asOf = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const create = () => {
    const label = kind === 'fleet'
      ? `Fleet hold · ${dates || 'dates TBD'}${detailField ? ` · ${detailField} pax` : ''}`
      : `Seat watch · ${detailField || 'route TBD'} · ${dates || 'window TBD'}`;
    dispatch({
      type: 'CREATE_WATCH',
      kind,
      label,
      detail: kind === 'fleet' ? 'Watching for any aircraft free across the window.' : 'Alerts you if a seat opens on any eligible flight matching route + window.',
    });
    setDates(''); setDetailField('');
  };

  return (
    <PortalShell title="Watches" meta={<AsOf>Fleet state as of {asOf}</AsOf>}>
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-3">
          {state.watches.map((w) => (
            <Card
              key={w.id}
              className={cn(
                'grid grid-cols-[auto_1fr_auto] items-center gap-4 p-4',
                w.status === 'freed' && 'border-l-[3px] border-l-[#D1AC6B]',
                w.status === 'expired' && 'opacity-55',
              )}
            >
              {w.status === 'watching' && <Chip tone="info">Watching</Chip>}
              {w.status === 'freed' && <Chip tone="gold">Freed</Chip>}
              {w.status === 'expired' && <Chip tone="neutral">Expired</Chip>}
              <div>
                <p className="text-sm font-semibold">{w.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{w.status === 'freed' ? w.freedNote : w.detail}</p>
              </div>
              <div className="flex gap-1.5">
                {w.status === 'watching' && (
                  <>
                    <button
                      type="button"
                      onClick={() => dispatch({ type: 'SIMULATE_FREE', id: w.id })}
                      className="border border-[#D1AC6B] px-2.5 py-1 text-[11px] font-semibold text-[#8A6A24] dark:text-[#D1AC6B]"
                      title="Demo control — stands in for the mirror noticing a cancellation"
                    >
                      Simulate: frees up
                    </button>
                    <button type="button" onClick={() => dispatch({ type: 'CANCEL_WATCH', id: w.id })} className="border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                      Cancel
                    </button>
                  </>
                )}
                {w.status === 'freed' && !w.prefillRequestId && (
                  <button
                    type="button"
                    onClick={() => navigate('/booking-portal/requests/new', { state: { fromWatchId: w.id } })}
                    className="bg-[#0096FC] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0077CC]"
                  >
                    Open pre-filled request
                  </button>
                )}
                {w.status === 'freed' && w.prefillRequestId && (
                  <Chip tone="info">Requested — {w.prefillRequestId}</Chip>
                )}
              </div>
            </Card>
          ))}
        </div>

        <Card className="h-fit p-4">
          <SectionLabel>New watch</SectionLabel>
          <div className="mb-2 flex gap-1.5">
            <button type="button" onClick={() => setKind('fleet')} className={cn('px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wide', kind === 'fleet' ? 'bg-[#0096FC]/10 text-[#0077CC] dark:text-[#4FB6FD]' : 'border border-border text-muted-foreground')}>Fleet dates</button>
            <button type="button" onClick={() => setKind('route')} className={cn('px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wide', kind === 'route' ? 'bg-[#0096FC]/10 text-[#0077CC] dark:text-[#4FB6FD]' : 'border border-border text-muted-foreground')}>Route seat</button>
          </div>
          <label className="mb-1 block text-xs text-muted-foreground">{kind === 'fleet' ? 'Dates' : 'Window'}</label>
          <input aria-label="Watch dates" className="mb-2 w-full border border-border bg-background px-2 py-1.5 text-sm" placeholder="Sep 2 – Sep 4" value={dates} onChange={(e) => setDates(e.target.value)} />
          <label className="mb-1 block text-xs text-muted-foreground">{kind === 'fleet' ? 'Passengers' : 'Route'}</label>
          <input aria-label="Watch detail" className="mb-3 w-full border border-border bg-background px-2 py-1.5 text-sm" placeholder={kind === 'fleet' ? '3' : 'KCVG → KTEB'} value={detailField} onChange={(e) => setDetailField(e.target.value)} />
          <button type="button" onClick={create} className="w-full bg-[#0096FC] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0077CC]">
            Start watching
          </button>
          <p className="mt-2 text-[11px] text-muted-foreground">A watch is advisory — it never holds an aircraft or a seat, and it expires with its window.</p>
        </Card>
      </div>
    </PortalShell>
  );
}
