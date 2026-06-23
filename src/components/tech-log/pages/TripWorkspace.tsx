import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTechLog } from '../TechLogContext';
import { deriveTripReadiness, type TripReadiness } from '../engine/readiness';
import { requiresFuelFarmSubmission } from '../engine/fuel';
import { deriveServiceability } from '../engine/serviceability';
import { deriveCustody } from '../engine/custody';
import { TechLogShell } from '../components/TechLogShell';
import { LifecycleStepper } from '../components/LifecycleStepper';
import { ServiceabilityChip } from '../components/ServiceabilityChip';
import { CustodyChip } from '../components/CustodyChip';
import { TripReadinessChip } from '../components/TripReadinessChip';
import { Card, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { cn } from '../../ui/utils';
import type { TripLeg } from '../types';

const HEADLINE: Record<TripReadiness, string> = { READY: 'Ready', NOT_READY: 'Almost ready', RED: 'Not ready' };
const zulu = (utc?: string) => (utc ? `${utc.slice(11, 16)}Z` : '—');

function fratText(l: TripLeg): { label: string; cls: string } {
  if (l.fratScore != null && l.fratScore >= 25) return { label: `FRAT no-go (${l.fratScore})`, cls: 'text-[var(--gfo-error,#EF3340)]' };
  if (l.fratStatus === 'COMPLETED') return { label: `FRAT ${l.fratScore ?? '✓'}`, cls: 'text-muted-foreground' };
  return { label: 'FRAT due', cls: 'text-[var(--gfo-warning,#F1B434)]' };
}

export default function TripWorkspace() {
  const { tripId } = useParams();
  const { state } = useTechLog();
  const navigate = useNavigate();
  const now = new Date().toISOString();

  const trip = state.trips.find(t => t.id === tripId);
  if (!trip) {
    return (
      <TechLogShell title="Trip">
        <Card><CardContent className="p-6 text-sm text-muted-foreground">
          Trip not found. <button className="underline" onClick={() => navigate('/tech-log/trips')}>Back to My trips</button>
        </CardContent></Card>
      </TechLogShell>
    );
  }

  const ac = state.aircraft.find(a => a.id === trip.aircraftId);
  const legs = (trip.legs ?? []).slice().sort((a, b) => a.sequence - b.sequence);
  const readiness = deriveTripReadiness(trip, state, now);
  const sv = ac ? deriveServiceability(ac.id, state, now) : undefined;
  const custody = ac ? deriveCustody(ac.id, state, now) : undefined;
  const route = legs.length ? `${legs[0].departureIcao} → ${legs.map(l => l.arrivalIcao).join(' → ')}` : '—';

  return (
    <TechLogShell
      title={`Trip ${trip.tripNumber}`}
      subtitle={`${ac?.tailNumber ?? '—'}${ac ? ` · ${ac.type}` : ''} · ${route}`}
      status={
        <span className="flex items-center gap-2">
          <TripReadinessChip state={readiness.state} />
          {custody && <CustodyChip state={custody.state} />}
        </span>
      }
      actions={<Button variant="outline" size="sm" onClick={() => navigate('/tech-log/trips')}><ArrowLeft className="mr-1.5 h-4 w-4" /> My trips</Button>}
    >
      {/* Readiness banner */}
      <Card className="mb-4">
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Trip readiness</div>
            <div className="mt-0.5 text-xl font-medium"><TripReadinessChip state={readiness.state} label={HEADLINE[readiness.state]} /></div>
            {readiness.blocker && <div className="mt-0.5 text-sm text-muted-foreground">{readiness.blocker}</div>}
          </div>
          {ac && <Button size="sm" onClick={() => navigate(`/tech-log/aircraft/${ac.tailNumber}`)}>Open aircraft</Button>}
        </CardContent>
      </Card>

      {/* Progress strip — reuse the aircraft lifecycle stepper */}
      {ac && <LifecycleStepper aircraft={ac} onSelect={() => navigate(`/tech-log/aircraft/${ac.tailNumber}`)} />}

      {/* Trip summary */}
      <Card className="mb-4">
        <CardContent className="grid grid-cols-2 gap-4 p-4 md:grid-cols-4">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Aircraft</div>
            <div className="mt-1">{ac ? (ac.isProvisional ? <Badge variant="outline">Provisional</Badge> : sv && <ServiceabilityChip status={sv.status} />) : '—'}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Departure</div>
            <div className="mt-1 font-mono text-sm">{zulu(legs[0]?.departureTimeUtc)}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Legs</div>
            <div className="mt-1 text-sm">{legs.length}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Status</div>
            <div className="mt-1 text-sm">{trip.status}</div>
          </div>
        </CardContent>
      </Card>

      {/* Legs */}
      <Card>
        <CardContent className="p-0">
          <div className="px-4 py-2 text-[11px] uppercase tracking-wide text-muted-foreground">Legs</div>
          {legs.length === 0 && <div className="px-4 py-6 text-sm text-muted-foreground">No legs planned for this trip yet.</div>}
          {legs.map(l => {
            const frat = fratText(l);
            const fuelDue = ac ? requiresFuelFarmSubmission(l, ac) && !l.fuelRequestId : false;
            return (
              <div key={l.id} onClick={() => navigate(`/tech-log/trips/${trip.id}/legs/${l.id}`)} className="flex cursor-pointer items-center justify-between gap-3 border-t px-4 py-3 hover:bg-muted/30">
                <div className="min-w-0">
                  <div className="font-mono text-sm">{l.departureIcao} → {l.arrivalIcao}</div>
                  <div className="text-xs text-muted-foreground">{zulu(l.departureTimeUtc)}</div>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-xs">
                  <span className={frat.cls}>{frat.label}</span>
                  <span className={l.airportReviewed ? 'text-muted-foreground' : 'text-[var(--gfo-warning,#F1B434)]'}>{l.airportReviewed ? 'Airport reviewed' : 'Airport pending'}</span>
                  {ac && requiresFuelFarmSubmission(l, ac) && (
                    <span className={cn(fuelDue ? 'text-[var(--gfo-warning,#F1B434)]' : 'text-muted-foreground')}>{l.fuelRequestId ? 'Fuel submitted' : `Fuel due (${l.departureIcao})`}</span>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </TechLogShell>
  );
}
