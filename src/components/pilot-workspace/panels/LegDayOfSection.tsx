import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Check } from 'lucide-react';
import { useTechLog, useCurrentUser } from '../../tech-log/TechLogContext';
import StandaloneFRATForm from '../../StandaloneFRATForm';
import { completeFratOnLeg, markAirportReviewedOnLeg, saveFratDraftOnLeg } from '../../tech-log/preflightActions';
import { extractFratSelections } from '../../tech-log/util/fratDraft';
import { newId } from '../../tech-log/util/id';
import { fratEarlySubmitWarning } from '../legContext';
import type { Trip, TripLeg } from '../../tech-log/types';

/** Day-of actions for one leg: FRAT (fill → draft → submit, with an early-submit soft warning) + airport review.
 *  Outstanding items lead; the airport data + full FRAT page keep their tech-log links. */
export function LegDayOfSection({ tlTrip, leg, tripNumber }: { tlTrip: Trip; leg: TripLeg; tripNumber: string }) {
  const { dispatch } = useTechLog();
  const user = useCurrentUser();
  const [fratOpen, setFratOpen] = useState(false);

  const submitFrat = (totalScore?: number) => {
    if (fratEarlySubmitWarning(new Date().toISOString(), leg.departureTimeUtc)) {
      if (!window.confirm('This FRAT is being submitted well before departure — conditions may change. Submit anyway?')) return;
    }
    completeFratOnLeg({ dispatch, newId, trip: tlTrip, leg, actorOid: user.oid, totalScore });
    setFratOpen(false);
  };

  return (
    <div className="space-y-3">
      {/* FRAT */}
      <div className="rounded-lg border p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">FRAT
            {leg.fratStatus === 'COMPLETED' && <span className="ml-2 text-xs text-emerald-700"><Check className="inline h-3.5 w-3.5" /> submitted{leg.fratScore != null ? ` · ${leg.fratScore}` : ''}</span>}
            {leg.fratStatus === 'IN_PROGRESS' && <span className="ml-2 text-xs text-amber-600">draft saved</span>}
            {leg.fratStatus === 'NOT_STARTED' && <span className="ml-2 text-xs text-amber-600">not started</span>}
          </span>
        </div>
        {leg.fratStatus !== 'COMPLETED' && (
          <button className="mt-2 text-sm rounded border px-3 py-2 min-h-[44px] hover:bg-accent"
            onClick={() => setFratOpen((o) => !o)}>
            {fratOpen ? 'Close FRAT' : leg.fratStatus === 'IN_PROGRESS' ? 'Resume FRAT (draft)' : 'Start FRAT'}
          </button>
        )}
        {fratOpen && (
          <div className="border-t mt-2 pt-2">
            <StandaloneFRATForm
              userRole={user.role}
              initialData={{ flightNumber: tripNumber, departure: leg.departureIcao, destination: leg.arrivalIcao,
                date: leg.departureTimeUtc.slice(0, 10), time: leg.departureTimeUtc.slice(11, 16), pic: user.displayName,
                selections: leg.fratDraft?.selections, mitigationNotes: leg.fratDraft?.mitigationNotes }}
              onClose={() => setFratOpen(false)}
              onSave={(data: { status?: string; totalScore?: number; mitigationNotes?: string; items?: { items: { selected: boolean }[] }[] }) => {
                if (data.status === 'submitted') {
                  submitFrat(data.totalScore);
                } else if (data.status === 'draft') {
                  saveFratDraftOnLeg({ dispatch, newId, trip: tlTrip, leg, actorOid: user.oid,
                    selections: extractFratSelections(data.items ?? []), mitigationNotes: data.mitigationNotes,
                    nowUtc: new Date().toISOString() });
                  setFratOpen(false);
                  toast.success('FRAT draft saved — resume any time before departure');
                }
              }}
            />
          </div>
        )}
      </div>

      {/* Airport review */}
      <div className="rounded-lg border p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Airport review
            {leg.airportReviewed
              ? <span className="ml-2 text-xs text-emerald-700"><Check className="inline h-3.5 w-3.5" /> reviewed</span>
              : <span className="ml-2 text-xs text-amber-600">not reviewed</span>}
          </span>
          <Link to={`/tech-log/trips/${tlTrip.id}/legs/${leg.id}`} className="text-xs text-primary hover:underline">open details ↗</Link>
        </div>
        {!leg.airportReviewed && (
          <button className="mt-2 text-sm rounded border px-3 py-2 min-h-[44px] hover:bg-accent"
            onClick={() => markAirportReviewedOnLeg({ dispatch, newId, trip: tlTrip, leg, actorOid: user.oid })}>
            Mark airport reviewed
          </button>
        )}
      </div>
    </div>
  );
}
