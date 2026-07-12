import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import StandaloneFRATForm from '../../StandaloneFRATForm';
import { ArrowLeft } from 'lucide-react';
import { useTechLog, useCurrentUser } from '../TechLogContext';
import { deriveTripReadiness } from '../engine/readiness';
import { requiresFuelFarmSubmission } from '../engine/fuel';
import { AirportInfoPanel } from '../components/AirportInfoPanel';
import { TripReadinessChip } from '../components/TripReadinessChip';
import { TechLogShell } from '../components/TechLogShell';
import { Card, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { newId } from '../util/id';
import { toast } from 'sonner';
import { completeFratOnLeg, markAirportReviewedOnLeg, submitFuelOnLeg, saveFratDraftOnLeg } from '../preflightActions';
import { extractFratSelections } from '../util/fratDraft';

const zulu = (utc?: string) => (utc ? `${utc.slice(11, 16)}Z` : '—');

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
  const [fuelLbs, setFuelLbs] = useState('14500');

  const completeFrat = (data: { totalScore?: number }) => {
    completeFratOnLeg({ dispatch, newId, trip, leg, actorOid: user.oid, totalScore: data.totalScore });
    setFratOpen(false);
  };

  const saveFratDraft = (data: { items?: { items: { selected: boolean }[] }[]; mitigationNotes?: string }) => {
    saveFratDraftOnLeg({
      dispatch, newId, trip, leg, actorOid: user.oid,
      selections: extractFratSelections(data.items ?? []),
      mitigationNotes: data.mitigationNotes,
      nowUtc: new Date().toISOString(),
    });
    setFratOpen(false);
    toast.success('FRAT draft saved — resume any time before departure');
  };

  const markAirportReviewed = () =>
    markAirportReviewedOnLeg({ dispatch, newId, trip, leg, actorOid: user.oid });

  const submitFuel = () => {
    const res = submitFuelOnLeg({ dispatch, newId, trip, leg, actorOid: user.oid, lbs: Number(fuelLbs), nowMs: Date.now() });
    if (!res.ok) { toast.error(res.error); return; }
    toast.success(`Fuel submitted to ${leg.departureIcao} fuel farm`);
  };

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
          <AirportInfoPanel
            departureIcao={leg.departureIcao}
            arrivalIcao={leg.arrivalIcao}
            reviewed={leg.airportReviewed}
            onMarkReviewed={markAirportReviewed}
          />
        </CardContent>
      </Card>

      {/* FRAT */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Flight risk assessment</div>
              <div className="mt-1 text-sm">
                {leg.fratStatus === 'COMPLETED' ? <>Complete · score <span className="font-mono">{leg.fratScore ?? '—'}</span></>
                  : leg.fratStatus === 'IN_PROGRESS' ? <>Draft saved {leg.fratDraft ? new Date(leg.fratDraft.savedAtUtc).toLocaleString() : ''} · resume below</>
                  : 'Not complete'}
              </div>
            </div>
            {!fratOpen && <Button size="sm" variant="outline" onClick={() => setFratOpen(true)}>
              {leg.fratStatus === 'COMPLETED' ? 'Redo FRAT' : leg.fratStatus === 'IN_PROGRESS' ? 'Resume FRAT (draft)' : 'Start FRAT'}
            </Button>}
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
                  selections: leg.fratDraft?.selections,
                  mitigationNotes: leg.fratDraft?.mitigationNotes,
                }}
                onClose={() => setFratOpen(false)}
                onSave={(data: any) => { if (data.status === 'submitted') completeFrat(data); else if (data.status === 'draft') saveFratDraft(data); }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fuel */}
      {ac && requiresFuelFarmSubmission(leg, ac) && (
        <Card>
          <CardContent className="p-4">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Fuel — {leg.departureIcao} fuel farm</div>
            {leg.fuelRequestId ? (
              <div className="mt-1 text-sm">Submitted · <span className="font-mono">{leg.fuelRequestId}</span></div>
            ) : (
              <div className="mt-2 flex items-center gap-2">
                <Input value={fuelLbs} onChange={e => setFuelLbs(e.target.value)} className="w-32" inputMode="numeric" aria-label="Fuel pounds" />
                <span className="text-sm text-muted-foreground">lb</span>
                <Button size="sm" onClick={submitFuel}>Submit to fuel farm</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </TechLogShell>
  );
}
