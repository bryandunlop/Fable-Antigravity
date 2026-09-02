// Metrics (D107): counts of events already on the trip records. Lead team and scheduling.

import { GfoPageHeader, GfoPanel } from '../../gfo';
import { useTripsModule } from '../TripsContext';
import { computeMetrics } from '../engine/metrics';

export default function MetricsPage() {
  const { allTrips, nowUtc, actor } = useTripsModule();
  if (actor.role !== 'scheduling') {
    return <div className="p-6"><GfoPanel><p className="text-sm text-muted-foreground">The metrics page is for the lead team and scheduling.</p></GfoPanel></div>;
  }
  const m = computeMetrics(allTrips, nowUtc(), 90);
  const pct = (n: number) => (m.requests ? Math.round((n / m.requests) * 100) : 0);
  return (
    <div className="mx-auto max-w-[1000px] space-y-4 p-6">
      <GfoPageHeader eyebrow="Lead · trips" title="Requests, last 90 days" description="Every number is a count of events on the trip records. The reason for a no is a category picked at the time, so it can be counted." />
      <GfoPanel title={`${m.requests} requests submitted`}>
        {m.requests === 0 ? <p className="text-sm text-muted-foreground">Nothing submitted in the window.</p> : (
          <>
            <div className="flex h-3 overflow-hidden rounded" aria-hidden>
              <div style={{ flex: m.accepted }} className="bg-primary" /><div style={{ flex: m.cancelled }} className="bg-[#D1AC6B]" /><div style={{ flex: m.denied }} className="bg-muted-foreground/40" /><div style={{ flex: Math.max(0, m.requests - m.accepted - m.cancelled - m.denied) }} className="bg-muted" />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{pct(m.accepted)}% accepted · {pct(m.cancelled)}% cancelled by the requester · {pct(m.denied)}% denied · the rest still open</p>
          </>
        )}
      </GfoPanel>
      <div className="grid gap-4 md:grid-cols-2">
        <GfoPanel title={`Denied · ${m.denied}`}>
          {m.deniedByCategory.length === 0 && <p className="text-sm text-muted-foreground">No denials.</p>}
          <ul className="divide-y divide-border text-sm">{m.deniedByCategory.map(d => <li key={d.category} className="flex justify-between py-1.5"><span>{d.label}</span><span className="tabular-nums">{d.count}</span></li>)}</ul>
        </GfoPanel>
        <GfoPanel title={`Bumped · ${m.bumps}`}>
          {m.bumpedByLead.length === 0 && <p className="text-sm text-muted-foreground">Nobody submitted a trip in the window.</p>}
          <ul className="divide-y divide-border text-sm">{m.bumpedByLead.map(b => <li key={b.lead} className="flex justify-between py-1.5"><span>{b.lead}</span><span className="tabular-nums">{b.bumped} of {b.trips}</span></li>)}</ul>
        </GfoPanel>
      </div>
    </div>
  );
}
