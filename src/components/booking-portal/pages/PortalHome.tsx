// Frame A — the eligibility-filtered week. Flights that fail the
// confidentiality projection for this EA are simply absent from the fixture
// set; there is nothing to redact because nothing renders.

import { Link } from 'react-router-dom';
import { PortalShell } from '../components/PortalShell';
import { AsOf, Card, Chip } from '../components/portalUi';
import { usePortal } from '../BookingPortalContext';
import { cn } from '../../ui/utils';

const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function nextSevenDays(): { iso: string; label: string; today: boolean }[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      iso: d.toISOString().slice(0, 10),
      label: `${DAY_LABELS[d.getDay()]} ${d.getDate()}`,
      today: i === 0,
    };
  });
}

export default function PortalHome() {
  const { state } = usePortal();
  const days = nextSevenDays();
  const activeWatches = state.watches.filter((w) => w.status !== 'expired');
  const asOf = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <PortalShell title="This week" meta={<AsOf>Schedule as of {asOf} · advisory</AsOf>}>
      {activeWatches.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 border border-border bg-muted/50 px-4 py-2.5 text-sm text-muted-foreground">
          {activeWatches.map((w) => (
            <span key={w.id} className="flex items-center gap-1.5">
              <Chip tone={w.status === 'freed' ? 'gold' : 'info'}>{w.status === 'freed' ? 'Freed' : 'Watching'}</Chip>
              {w.label}
            </span>
          ))}
          <Link to="/booking-portal/watches" className="ml-auto text-xs font-semibold text-[#0077CC] dark:text-[#4FB6FD]">
            Manage watches
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-7">
        {days.map((day) => {
          const flights = state.flights.filter((f) => f.date === day.iso);
          return (
            <div key={day.iso} className="min-h-[130px] bg-card p-2.5">
              <p className={cn('text-[11px] font-semibold tracking-wide', day.today ? 'text-[#0096FC]' : 'text-muted-foreground')}>
                {day.label}
              </p>
              {flights.map((f) => {
                const own = f.ownPrincipalIds.length > 0;
                const ownNames = f.ownPrincipalIds
                  .map((id) => state.passengers.find((p) => p.id === id)?.name)
                  .filter(Boolean)
                  .join(', ');
                return (
                  <div
                    key={f.id}
                    className={cn(
                      'mt-1.5 border-l-[3px] px-2 py-1.5 text-[11px] leading-snug',
                      own ? 'border-[#D1AC6B] bg-[#D1AC6B]/10' : 'border-[#0096FC] bg-[#0096FC]/10',
                    )}
                  >
                    <p className="font-semibold">{f.from} → {f.to}</p>
                    <p className="text-muted-foreground">{f.depart} – {f.arrive} · {f.aircraft}</p>
                    {own && <p className="text-muted-foreground">{ownNames}{f.manifestLocked ? ' · manifest locked' : ''}</p>}
                    {f.seatsOpen > 0 ? (
                      <p className="font-semibold text-[#008130] dark:text-[#34C46A]">{f.seatsOpen} seat{f.seatsOpen === 1 ? '' : 's'} open</p>
                    ) : (
                      !own && <p className="text-muted-foreground">full</p>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground/80">
          Gold cards are trips your principals are on; blue cards are other eligible flights — route, times,
          aircraft, and open seats only. Flights outside your eligibility do not appear at all.
        </p>
        <Link
          to="/booking-portal/requests/new"
          className="bg-[#0096FC] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0077CC]"
        >
          New trip request
        </Link>
      </div>

      <Card className="mt-6 p-4">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">Demo notes.</span> Everything on this page runs on
          fixtures — no myairops call exists behind it. Availability is advisory and always labeled with its
          as-of time; the confidentiality projection is precomputed into the fixture set.
        </p>
      </Card>
    </PortalShell>
  );
}
