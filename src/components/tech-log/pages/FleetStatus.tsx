import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plane, ChevronRight, Clock, AlertTriangle, Wrench } from 'lucide-react';
import { useTechLog } from '../TechLogContext';
import { deriveServiceability } from '../engine/serviceability';
import { currentRows } from '../engine/supersede';
import { ServiceabilityChip } from '../components/ServiceabilityChip';
import { TechLogShell } from '../components/TechLogShell';
import { Card, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { cn } from '../../ui/utils';
import type { Serviceability } from '../types';

function countdown(dueIso?: string): { label: string; urgent: boolean } | null {
  if (!dueIso) return null;
  const ms = new Date(dueIso).getTime() - Date.now();
  if (ms <= 0) return { label: 'overdue', urgent: true };
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  return { label: days >= 1 ? `${days}d ${hours}h left` : `${hours}h left`, urgent: days < 2 };
}

const RING: Record<Serviceability, string> = {
  RED: 'border-l-4 border-l-[var(--gfo-error,#EF3340)]',
  AMBER: 'border-l-4 border-l-[var(--gfo-warning,#F1B434)]',
  GREEN: 'border-l-4 border-l-[var(--gfo-success,#00B140)]',
};

export default function FleetStatus() {
  const { state } = useTechLog();
  const navigate = useNavigate();
  const now = new Date();

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
      const dueDates = activeDeferrals.map(d => d.repairDueDateUtc).filter(Boolean) as string[];
      const nearestDue = dueDates.sort()[0];
      return { ac, sv, openDefects, activeDeferrals, nearestDue };
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

  const stat = (label: string, value: number, cls: string) => (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="text-3xl font-semibold tabular-nums">{value}</div>
        </div>
        <span className={cn('h-10 w-10 rounded-full', cls)} />
      </CardContent>
    </Card>
  );

  return (
    <TechLogShell
      title="Fleet Status"
      subtitle={`Airworthiness picture as of ${now.toLocaleString()} · refreshes on sync`}
    >
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {stat('Grounded', counts.RED, 'bg-[var(--gfo-error,#EF3340)]')}
        {stat('MEL / restricted', counts.AMBER, 'bg-[var(--gfo-warning,#F1B434)]')}
        {stat('Serviceable', counts.GREEN, 'bg-[var(--gfo-success,#00B140)]')}
        {stat('Provisional', counts.prov, 'bg-muted-foreground/40')}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.map(({ ac, sv, openDefects, activeDeferrals, nearestDue }) => {
          const cd = countdown(nearestDue);
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
                    <div className="mt-1 text-xs text-muted-foreground">
                      {ac.type} · S/N {ac.serialNumber}
                    </div>
                  </div>
                </div>
                {ac.isProvisional ? (
                  <Badge variant="outline">Provisional</Badge>
                ) : (
                  <ServiceabilityChip status={sv} />
                )}
              </div>

              <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {openDefects.length} open
                </span>
                <span className="inline-flex items-center gap-1">
                  <Wrench className="h-3.5 w-3.5" />
                  {activeDeferrals.length} MEL
                </span>
                {cd && (
                  <span className={cn('ml-auto inline-flex items-center gap-1', cd.urgent && 'text-[var(--gfo-error,#EF3340)]')}>
                    <Clock className="h-3.5 w-3.5" />
                    {cd.label}
                  </span>
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
