// Passenger data-currency dashboard (LG-21, scheduler-facing half): upcoming
// myairops trips × CRM passenger freshness. All assessment logic + tests live
// in currency.ts; this page is presentation + demo outreach tracking only.

import { useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { CalendarClock, CheckCircle2, CircleAlert, FileWarning, Mail, UserX } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { buildMyairopsBookingFixtures } from '../../integration/myairops/fixtures/bookingTrips';
import { buildCrmContactFixtures } from '../../integration/myairops/fixtures/crmContacts';
import { mapBookingTripToTripRecord } from '../../integration/myairops/bookingAdapter';
import { mapCrmContactToSnapshot } from '../../integration/myairops/crmAdapter';
import {
  assessTripPassengerCurrency,
  type PassengerCurrencyFinding,
  type PassengerCurrencyStatus,
  type TripManifestInput,
} from './currency';
import { STALE_AFTER_DAYS } from './policy';
import { useOutreach, outreachKey } from './outreach';

const STATUS_META: Record<PassengerCurrencyStatus, { label: string; icon: React.ElementType; className: string }> = {
  DOC_EXPIRING: { label: 'Document expiring', icon: FileWarning, className: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' },
  UNMATCHED: { label: 'No CRM link', icon: UserX, className: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' },
  STALE: { label: 'Info stale', icon: CircleAlert, className: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
  CURRENT: { label: 'Current', icon: CheckCircle2, className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
};

function fmtUtcDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' });
}

function rel(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true });
}

export default function PassengerCurrencyDashboard() {
  const [needsActionOnly, setNeedsActionOnly] = useState(false);
  const { outreach, mark } = useOutreach();

  // Fixture-backed demo data through the REAL myairops adapters (the exact
  // Phase-2 pull path). nowUtc is captured once per mount for stable rendering.
  const groups = useMemo(() => {
    const nowUtc = new Date().toISOString();
    const manifests: TripManifestInput[] = buildMyairopsBookingFixtures(nowUtc).map(f => {
      const rec = mapBookingTripToTripRecord(f.trip, { nowUtc });
      return {
        tripId: rec.id,
        tripNumber: rec.tripNumber,
        tail: rec.tail,
        firstEtdUtc: rec.startDate,
        tripEndUtc: rec.endDate,
        passengers: f.passengers.map(p => ({
          name: p.details?.fullName ?? 'Unknown',
          crmPassengerId: p.crmPassengerId ?? null,
        })),
      };
    });
    const snapshots = buildCrmContactFixtures(nowUtc).map(mapCrmContactToSnapshot);
    return assessTripPassengerCurrency(manifests, snapshots, nowUtc);
  }, []);

  const totals = useMemo(() => {
    const all = groups.flatMap(g => g.passengers);
    return {
      passengers: all.length,
      needsAction: all.filter(p => p.status !== 'CURRENT').length,
      docExpiring: all.filter(p => p.status === 'DOC_EXPIRING').length,
    };
  }, [groups]);

  const visibleGroups = needsActionOnly
    ? groups
        .map(g => ({ ...g, passengers: g.passengers.filter(p => p.status !== 'CURRENT') }))
        .filter(g => g.passengers.length > 0)
    : groups;

  const outreachControls = (p: PassengerCurrencyFinding) => {
    if (p.status === 'CURRENT') return null;
    const key = outreachKey(p);
    const state = outreach[key]?.status ?? 'none';
    if (state === 'received') {
      return <Badge variant="outline" className="text-emerald-700 dark:text-emerald-400">Updated info received {rel(outreach[key].atUtc)}</Badge>;
    }
    if (state === 'link_sent') {
      return (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-muted-foreground">Link sent {rel(outreach[key].atUtc)}</Badge>
          <Button size="sm" variant="outline" onClick={() => mark(key, 'received')}>Mark received</Button>
        </div>
      );
    }
    return (
      <Button size="sm" variant="outline" onClick={() => mark(key, 'link_sent')}>
        <Mail className="h-3.5 w-3.5 mr-1.5" /> Mark update link sent
      </Button>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Passenger Data Currency</h1>
          <p className="text-sm text-muted-foreground">
            Upcoming-trip manifests × CRM freshness · policy: updated within {STALE_AFTER_DAYS / 365} years, travel document valid through trip end
          </p>
        </div>
        <Button
          variant={needsActionOnly ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => setNeedsActionOnly(v => !v)}
        >
          {needsActionOnly ? 'Showing needs-action' : 'Show needs-action only'}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <Badge variant="outline">{totals.passengers} passengers on upcoming trips</Badge>
        <Badge variant="outline" className="text-amber-700 dark:text-amber-400">{totals.needsAction} need action</Badge>
        {totals.docExpiring > 0 && (
          <Badge variant="outline" className="text-red-700 dark:text-red-400">{totals.docExpiring} document{totals.docExpiring === 1 ? '' : 's'} expiring</Badge>
        )}
      </div>

      <p className="text-xs text-muted-foreground border rounded-md px-3 py-2 bg-muted/40">
        Freshness uses the CRM record-modified date as an <span className="font-medium">advisory proxy</span> — it moves on any
        edit, not only passenger confirmation. Outreach buttons record scheduler intent locally; the automatic email and any
        write-back to myairops are design-gated (pull-only rule — LG-21) and not wired.
      </p>

      {visibleGroups.map(g => (
        <div key={g.tripId} className="rounded-lg border bg-card">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 border-b">
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">{g.tripNumber}</span>
            <span className="text-xs font-mono text-muted-foreground">{g.tail}</span>
            <span className="text-xs text-muted-foreground">
              {fmtUtcDate(g.firstEtdUtc)} → {fmtUtcDate(g.tripEndUtc)} (UTC)
            </span>
            <span className="ml-auto text-xs text-muted-foreground">
              {g.needsActionCount === 0 ? 'All current' : `${g.needsActionCount} of ${g.passengers.length} need action`}
            </span>
          </div>
          <ul className="divide-y">
            {g.passengers.map(p => {
              const meta = STATUS_META[p.status];
              const Icon = meta.icon;
              return (
                <li key={`${g.tripId}-${outreachKey(p)}`} className="px-4 py-2.5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <span className="text-sm font-medium min-w-36">{p.name}</span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${meta.className}`}>
                      <Icon className="h-3 w-3" /> {meta.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {p.lastModifiedUtc ? `CRM updated ${rel(p.lastModifiedUtc)}` : p.status === 'UNMATCHED' ? 'no CRM record' : 'no update date'}
                      {p.docKind ? ` · ${p.docKind}${p.docTail ? ` ${p.docTail}` : ''}${p.docExpiresUtc ? ` expires ${fmtUtcDate(p.docExpiresUtc)}` : ''}` : ''}
                    </span>
                    <div className="ml-auto">{outreachControls(p)}</div>
                  </div>
                  {p.reasons.length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">{p.reasons.join(' · ')}</p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
