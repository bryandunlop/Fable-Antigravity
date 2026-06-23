import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import StandaloneFRATForm from '../../StandaloneFRATForm';
import { ArrowLeft } from 'lucide-react';
import { useTechLog, useCurrentUser } from '../TechLogContext';
import { deriveTripReadiness } from '../engine/readiness';
import { requiresFuelFarmSubmission } from '../engine/fuel';
import { airportInfo, type AirportInfo } from '../mockData/airports';
import { TripReadinessChip } from '../components/TripReadinessChip';
import { TechLogShell } from '../components/TechLogShell';
import { Card, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { newId } from '../util/id';
import type { TripLeg, Trip } from '../types';

const zulu = (utc?: string) => (utc ? `${utc.slice(11, 16)}Z` : '—');

function AirportCard({ role, info, icao }: { role: string; info?: AirportInfo; icao: string }) {
  return (
    <div className="p-4">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{role}</div>
      <div className="mt-1 flex items-center gap-2">
        <span className="font-mono text-sm font-medium">{icao}</span>
        {info?.mountainous && <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-900">mountainous</span>}
      </div>
      {!info && <div className="mt-2 text-sm text-muted-foreground">No airport data on file.</div>}
      {info && (
        <div className="mt-2 space-y-0.5 text-xs">
          <div className="text-muted-foreground">{info.name} · elev <span className="font-mono">{info.elevationFt.toLocaleString()}′</span></div>
          {info.runways.map(r => <div key={r.id}>RWY <span className="font-mono">{r.id}</span> · LDA <span className="font-mono">{r.ldaFt.toLocaleString()}′</span></div>)}
          {info.approaches.map((a, i) => <div key={i}>{a.type} {a.runway} · <span className="font-mono">{a.glidepath}°</span></div>)}
          <div>{info.fbo} · {info.jetA ? 'Jet A' : 'no Jet A'} · {info.deice ? 'deice' : 'no deice'}</div>
          {info.limitations && <div className="text-amber-700">{info.limitations}</div>}
        </div>
      )}
    </div>
  );
}

export default function LegDetail() {
  const { tripId, legId } = useParams();
  const { state, dispatch } = useTechLog();
  const user = useCurrentUser();
  const navigate = useNavigate();
  const now = new Date().toISOString();

  const trip = state.trips.find(t => t.id === tripId);
  const leg = trip?.legs?.find(l => l.id === legId);
  if (!trip || !leg) {
    return (
      <TechLogShell title="Leg">
        <Card><CardContent className="p-6 text-sm text-muted-foreground">
          Leg not found. <button className="underline" onClick={() => navigate('/tech-log/trips')}>Back to My trips</button>
        </CardContent></Card>
      </TechLogShell>
    );
  }
  const ac = state.aircraft.find(a => a.id === trip.aircraftId);
  const readiness = deriveTripReadiness(trip, state, now);

  const [fratOpen, setFratOpen] = useState(false);

  const patchLeg = (patch: Partial<TripLeg>, auditAction: string, summary: string) => {
    const updated: Trip = { ...trip, legs: (trip.legs ?? []).map(l => (l.id === leg.id ? { ...l, ...patch } : l)) };
    dispatch({ type: 'EDIT_TRIP', payload: updated });
    dispatch({ type: 'ADD_AUDIT', payload: { id: newId('aud'), actorOid: user.oid, action: auditAction, entityType: 'TripLeg', entityId: leg.id, atUtc: new Date().toISOString(), summary } });
  };

  const completeFrat = (data: { totalScore?: number }) => {
    patchLeg({ fratStatus: 'COMPLETED', fratScore: data.totalScore }, 'LEG_FRAT_COMPLETED', `${trip.tripNumber} leg ${leg.sequence} FRAT score ${data.totalScore ?? '—'}`);
    setFratOpen(false);
  };

  const markAirportReviewed = () =>
    patchLeg({ airportReviewed: true }, 'LEG_AIRPORT_REVIEWED', `${trip.tripNumber} leg ${leg.sequence} (${leg.departureIcao}→${leg.arrivalIcao}) airport reviewed`);

  return (
    <TechLogShell
      title={`Leg ${leg.sequence} · ${leg.departureIcao} → ${leg.arrivalIcao}`}
      subtitle={`Trip ${trip.tripNumber} · ${ac?.tailNumber ?? '—'} · dep ${zulu(leg.departureTimeUtc)}`}
      status={<TripReadinessChip state={readiness.state} />}
      actions={<Button variant="outline" size="sm" onClick={() => navigate(`/tech-log/trips/${trip.id}`)}><ArrowLeft className="mr-1.5 h-4 w-4" /> Trip</Button>}
    >
      {/* Airport information */}
      <Card className="mb-4">
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-4 py-2">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Airport information</div>
            {leg.airportReviewed
              ? <span className="text-xs text-muted-foreground">Reviewed</span>
              : <Button size="sm" variant="outline" onClick={markAirportReviewed}>Mark reviewed</Button>}
          </div>
          <div className="grid grid-cols-1 border-t md:grid-cols-2 md:divide-x">
            <AirportCard role="Departure" icao={leg.departureIcao} info={airportInfo(leg.departureIcao)} />
            <AirportCard role="Destination" icao={leg.arrivalIcao} info={airportInfo(leg.arrivalIcao)} />
          </div>
        </CardContent>
      </Card>

      {/* FRAT */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Flight risk assessment</div>
              <div className="mt-1 text-sm">{leg.fratStatus === 'COMPLETED' ? <>Complete · score <span className="font-mono">{leg.fratScore ?? '—'}</span></> : 'Not complete'}</div>
            </div>
            {!fratOpen && <Button size="sm" variant="outline" onClick={() => setFratOpen(true)}>{leg.fratStatus === 'COMPLETED' ? 'Redo FRAT' : 'Start FRAT'}</Button>}
          </div>
          {fratOpen && (
            <div className="mt-3 border-t pt-3">
              <StandaloneFRATForm
                userRole={user.role}
                initialData={{
                  flightNumber: trip.tripNumber,
                  aircraft: ac?.tailNumber,
                  departure: leg.departureIcao,
                  destination: leg.arrivalIcao,
                  date: leg.departureTimeUtc.slice(0, 10),
                  time: leg.departureTimeUtc.slice(11, 16),
                  pic: user.displayName,
                }}
                onClose={() => setFratOpen(false)}
                onSave={(data: any) => { if (data.status === 'submitted') completeFrat(data); }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fuel (submission added in a later task) */}
      {ac && requiresFuelFarmSubmission(leg, ac) && (
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Fuel — {leg.departureIcao} fuel farm</div>
              <div className="mt-1 text-sm">{leg.fuelRequestId ? <>Submitted · <span className="font-mono">{leg.fuelRequestId}</span></> : 'Not submitted'}</div>
            </div>
          </CardContent>
        </Card>
      )}
    </TechLogShell>
  );
}
