// Frame A — the eligibility-filtered week. Flights that fail the
// confidentiality projection for this EA are simply absent from the fixture
// set; there is nothing to redact because nothing renders.

import { Link } from 'react-router-dom';
import { CalendarDays, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { PortalShell } from '../components/PortalShell';
import { AsOf, Chip } from '../components/portalUi';
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
  const seatsOpen = state.flights.reduce((n, f) => n + f.seatsOpen, 0);

  return (
    <PortalShell
      title="This week"
      meta={<AsOf>Schedule as of {asOf} · advisory, never inventory</AsOf>}
      actions={
        <Button asChild size="sm">
          <Link to="/booking-portal/requests/new"><Plus className="mr-1.5 h-4 w-4" /> New trip request</Link>
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        {activeWatches.length > 0 && (
          <Card>
            <CardContent className="flex flex-wrap items-center gap-3 p-4 text-sm">
              <span className="mr-1 text-xs font-medium text-muted-foreground">
                {activeWatches.length} watch{activeWatches.length === 1 ? '' : 'es'} · {seatsOpen} seat{seatsOpen === 1 ? '' : 's'} open this week
              </span>
              {activeWatches.map((w) => (
                <span key={w.id} className="flex items-center gap-1.5">
                  <Chip tone={w.status === 'freed' ? 'gold' : 'info'}>{w.status === 'freed' ? 'Freed' : 'Watching'}</Chip>
                  <span className="text-muted-foreground">{w.label}</span>
                </span>
              ))}
              <Link to="/booking-portal/watches" className="ml-auto text-xs font-semibold text-[var(--gfo-daylight-deep,#0077CC)] dark:text-[var(--gfo-daylight,#0096FC)]">
                Manage watches
              </Link>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="py-4">
            <CardTitle className="flex flex-wrap items-center gap-2.5 text-base">
              <span className="status-badge status-info p-1.5"><CalendarDays className="h-4 w-4" /></span>
              Eligible flights
              <Badge variant="secondary">{state.flights.length}</Badge>
              <span className="text-xs font-normal text-muted-foreground">
                gold is a trip your principals are on; blue is another eligible flight
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 lg:grid-cols-7">
              {days.map((day) => {
                const flights = state.flights.filter((f) => f.date === day.iso);
                return (
                  <div key={day.iso} className="min-h-[132px] bg-card p-2.5">
                    <p className={cn('text-[11px] font-semibold tracking-wide', day.today ? 'text-[var(--gfo-daylight,#0096FC)]' : 'text-muted-foreground')}>
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
                            'mt-1.5 rounded-md border-l-[3px] px-2 py-1.5 text-[11px] leading-snug',
                            own
                              ? 'border-l-[var(--gfo-sunrise,#D1AC6B)] bg-[color-mix(in_srgb,var(--gfo-sunrise,#D1AC6B)_12%,transparent)]'
                              : 'border-l-[var(--gfo-daylight,#0096FC)] bg-[color-mix(in_srgb,var(--gfo-daylight,#0096FC)_10%,transparent)]',
                          )}
                        >
                          <p className="font-semibold">{f.from} → {f.to}</p>
                          <p className="text-muted-foreground">{f.depart} – {f.arrive} · {f.aircraft}</p>
                          {own && <p className="text-muted-foreground">{ownNames}{f.manifestLocked ? ' · locked' : ''}</p>}
                          {f.seatsOpen > 0 ? (
                            <p className="font-semibold text-[var(--gfo-success-ink,#00803A)] dark:text-[#7BE3A3]">
                              {f.seatsOpen} seat{f.seatsOpen === 1 ? '' : 's'} open
                            </p>
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
            <p className="mt-3 text-xs text-muted-foreground">
              Flights outside your eligibility do not render at all — no locked rows, nothing to redact.
              Everything here runs on fixtures; no myairops call exists behind it.
            </p>
          </CardContent>
        </Card>
      </div>
    </PortalShell>
  );
}
