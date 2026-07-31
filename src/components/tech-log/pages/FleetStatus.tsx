import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plane, ChevronRight, AlertTriangle, Wrench } from 'lucide-react';
import { useTechLog } from '../TechLogContext';
import { deriveServiceability } from '../engine/serviceability';
import { currentRows } from '../engine/supersede';
import { ServiceabilityChip } from '../components/ServiceabilityChip';
import { DeferralClock } from '../components/DeferralClock';
import { TechLogShell } from '../components/TechLogShell';
import { Card, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { cn } from '../../ui/utils';
import type { Serviceability } from '../types';

type Filter = 'ALL' | 'RED' | 'AMBER' | 'GREEN' | 'PROV';

const RING: Record<Serviceability, string> = {
  RED: 'border-l-4 border-l-[var(--gfo-error,#EF3340)]',
  AMBER: 'border-l-4 border-l-[var(--gfo-warning,#F1B434)]',
  GREEN: 'border-l-4 border-l-[var(--gfo-success,#00B140)]',
};

export default function FleetStatus() {
  const { state } = useTechLog();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const now = new Date();
  const requested = params.get('filter');
  const [filter, setFilter] = useState<Filter>(
    requested && ['ALL', 'RED', 'AMBER', 'GREEN', 'PROV'].includes(requested) ? (requested as Filter) : 'ALL',
  );

  const rows = useMemo(() => {
    const asOf = now.toISOString();
    return state.aircraft.map(ac => {
      const sv = deriveServiceability(ac.id, state, asOf).status;
      const openDefects = currentRows(state.defects).filter(
        d => d.aircraftId === ac.id && (d.status === 'OPEN' || d.status === 'DEFERRED'),
      );
      const activeDeferrals = currentRows(state.deferrals).filter(
        d => d.aircraftId === ac.id && (d.status === 'ACTIVE' || d.status === 'PENDING_PLACARD'),
      );
      // Keep the deferral itself, not just its due date: the clock needs its start to
      // know how much of the repair interval has drained.
      const nearestDeferral = activeDeferrals
        .filter(d => d.repairDueDateUtc)
        .sort((a, b) => a.repairDueDateUtc!.localeCompare(b.repairDueDateUtc!))[0];
      // AOG escalation (folded in from the former AOG tab): downtime since the oldest open defect.
      const since = openDefects.map(d => d.reportedAtUtc).sort()[0];
      const downHours = since ? Math.floor((Date.now() - new Date(since).getTime()) / 3600000) : 0;
      const esc = downHours >= 24 ? 'CRITICAL' : downHours >= 4 ? 'ELEVATED' : 'MONITOR';
      return { ac, sv, openDefects, activeDeferrals, nearestDeferral, since, downHours, esc };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const counts = rows.reduce(
    (a, r) => {
      if (r.ac.isProvisional) a.prov++;
      else a[r.sv]++;
      return a;
    },
    { RED: 0, AMBER: 0, GREEN: 0, prov: 0 } as Record<string, number>,
  );

  const visible = rows.filter(r => {
    if (filter === 'ALL') return true;
    if (filter === 'PROV') return r.ac.isProvisional;
    return !r.ac.isProvisional && r.sv === filter;
  });

  /**
   * LG-171 — the count tile used to pair the numeral with a 40px filled circle in the RAG hue.
   * The circle was the largest, most saturated object on the page and encoded nothing the numeral
   * and label beside it did not already carry; meanwhile `13h left` on a deferral clock — the fact
   * that decides whether a jet flies — rendered at 12px. The hue moves onto the numeral itself, so
   * the colour axis (D41: RAG is airworthiness only) is intact with strictly less ink.
   *
   * A zero count drops to muted: an empty grounded bucket is good news and should not shout in red.
   */
  const stat = (label: string, value: number, tone: string, f: Filter) => (
    <button onClick={() => setFilter(filter === f ? 'ALL' : f)} className="text-left">
      <Card className={cn('gfo-stat-rule transition-colors hover:bg-accent/40', filter === f && 'ring-2 ring-primary')}>
        <CardContent className="p-4">
          <div className="gfo-eyebrow">{label}</div>
          <div className={cn('gfo-numeric mt-1 text-4xl leading-none', value === 0 ? 'text-muted-foreground' : tone)}>
            {value}
          </div>
        </CardContent>
      </Card>
    </button>
  );

  return (
    <TechLogShell
      title="Fleet Status"
      subtitle={`Airworthiness picture as of ${now.toLocaleString()} · refreshes on sync`}
    >
      <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        {stat('Grounded', counts.RED, 'text-[var(--gfo-error,#EF3340)]', 'RED')}
        {stat('MEL / restricted', counts.AMBER, 'text-[var(--gfo-warning,#F1B434)]', 'AMBER')}
        {stat('Serviceable', counts.GREEN, 'text-[var(--gfo-success,#00B140)]', 'GREEN')}
        {stat('Provisional', counts.prov, 'text-muted-foreground', 'PROV')}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(['ALL', 'RED', 'AMBER', 'GREEN', 'PROV'] as Filter[]).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn('rounded-full border px-3 py-1 text-xs transition-colors', filter === f ? 'border-primary bg-accent font-medium' : 'text-muted-foreground hover:bg-accent/50')}>
            {f === 'ALL' ? 'All' : f === 'RED' ? 'Grounded' : f === 'AMBER' ? 'MEL' : f === 'GREEN' ? 'Serviceable' : 'Provisional'}
          </button>
        ))}
        {filter === 'RED' && <span className="text-xs text-muted-foreground">AOG view — grounded aircraft with downtime &amp; escalation.</span>}
      </div>

      <p className="mb-3 text-xs text-muted-foreground">
        Note: work performed by outside MROs is recorded in CAMP and may not appear here — this board reflects myGFO-signed records only.
      </p>

      {visible.length === 0 && (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No aircraft match this filter.</CardContent></Card>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {visible.map(({ ac, sv, openDefects, activeDeferrals, nearestDeferral, since, downHours, esc }) => {
          const showAog = filter === 'RED' && !ac.isProvisional && sv === 'RED';
          return (
            <button
              key={ac.id}
              onClick={() => navigate(`/tech-log/aircraft/${ac.tailNumber}`)}
              className={cn(
                'group rounded-lg border bg-card p-4 text-left transition-colors hover:bg-accent/40',
                ac.isProvisional ? 'border-l-4 border-l-muted-foreground/40' : RING[sv],
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Plane className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-lg font-semibold leading-none">{ac.tailNumber}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{ac.type} · S/N {ac.serialNumber}</div>
                  </div>
                </div>
                {ac.isProvisional ? <Badge variant="outline">Provisional</Badge> : <ServiceabilityChip status={sv} />}
              </div>

              {showAog && (
                <div className="mt-3 flex items-center gap-2 rounded bg-[var(--gfo-error,#EF3340)]/10 px-2 py-1 text-xs text-[var(--gfo-error,#EF3340)]">
                  <Badge variant="destructive">{esc}</Badge>
                  down {downHours}h{since ? ` · since ${new Date(since).toLocaleString()}` : ''}
                </div>
              )}

              <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap"><AlertTriangle className="h-3.5 w-3.5" />{openDefects.length} open</span>
                <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap"><Wrench className="h-3.5 w-3.5" />{activeDeferrals.length} MEL</span>
                {/* LG-155 — the tile's clock is deliberately NOT the inline size used on list rows.
                    This is the one number on the card that decides whether the aircraft flies
                    tomorrow, and it was previously the smallest thing on it. */}
                {nearestDeferral && (
                  <DeferralClock
                    className="ml-auto"
                    size="lg"
                    clockStartUtc={nearestDeferral.clockStartDateUtc}
                    repairDueUtc={nearestDeferral.repairDueDateUtc}
                    category={nearestDeferral.category}
                  />
                )}
                <ChevronRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
              </div>

              {ac.isProvisional && (
                <div className="mt-3 rounded bg-muted/60 px-2 py-1 text-xs text-muted-foreground">
                  G800 onboarding — D195 MEL pending FSDO approval. Deferrals blocked.
                </div>
              )}
            </button>
          );
        })}
      </div>
    </TechLogShell>
  );
}
