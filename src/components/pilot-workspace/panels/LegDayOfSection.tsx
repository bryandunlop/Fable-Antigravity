import { useState } from 'react';
import { toast } from 'sonner';
import { Check, ChevronRight } from 'lucide-react';
import { useTechLog, useCurrentUser } from '../../tech-log/TechLogContext';
import StandaloneFRATForm from '../../StandaloneFRATForm';
import { completeFratOnLeg, markAirportReviewedOnLeg, saveFratDraftOnLeg } from '../../tech-log/preflightActions';
import { extractFratSelections } from '../../tech-log/util/fratDraft';
import { newId } from '../../tech-log/util/id';
import { fratEarlySubmitWarning } from '../legContext';
import type { Trip, TripLeg } from '../../tech-log/types';

/** FRAT & airport module body (board): FRAT (fill → draft → submit, with an early-submit soft
 *  warning) plus airport review, for the selected leg. Bare — the ModuleCard supplies the header. */
export function LegDayOfSection({ tlTrip, leg, tripNumber, onOpenAirport }: { tlTrip: Trip; leg: TripLeg; tripNumber: string; onOpenAirport: () => void }) {
  const { state, dispatch } = useTechLog();
  const ac = state.aircraft.find((a) => a.id === tlTrip.aircraftId);
  const user = useCurrentUser();
  const [fratOpen, setFratOpen] = useState(false);

  type FratSubmission = {
    totalScore?: number;
    items?: { title: string; items: { id: string; label: string; score: number; selected: boolean }[] }[];
    mitigationNotes?: string;
    additionalNotes?: string;
  };

  const submitFrat = (data: FratSubmission) => {
    if (fratEarlySubmitWarning(new Date().toISOString(), leg.departureTimeUtc)) {
      if (!window.confirm('This FRAT is being submitted well before departure — conditions may change. Submit anyway?')) return;
    }
    completeFratOnLeg({
      dispatch, newId, trip: tlTrip, leg, actorOid: user.oid,
      totalScore: data.totalScore,
      assessment: data.items,
      mitigationNotes: data.mitigationNotes,
      additionalNotes: data.additionalNotes,
      nowUtc: new Date().toISOString(),
    });
    setFratOpen(false);
  };

  return (
    <div className="space-y-3 text-sm">
      {/* FRAT */}
      <div>
        <span className="font-medium">FRAT · leg {leg.sequence}
          {leg.fratStatus === 'COMPLETED' && <span className="ml-2 text-xs text-emerald-700"><Check className="inline h-3.5 w-3.5" /> submitted{leg.fratScore != null ? ` · ${leg.fratScore}` : ''}</span>}
          {leg.fratStatus === 'IN_PROGRESS' && <span className="ml-2 text-xs text-muted-foreground">draft saved</span>}
          {leg.fratStatus === 'NOT_STARTED' && <span className="ml-2 text-xs text-muted-foreground">not started</span>}
        </span>
        {leg.fratStatus !== 'COMPLETED' && (
          <div>
            <button className="mt-2 min-h-[44px] rounded border px-3 py-2 text-sm hover:bg-accent"
              onClick={() => setFratOpen((o) => !o)}>
              {fratOpen ? 'Close FRAT' : leg.fratStatus === 'IN_PROGRESS' ? 'Resume FRAT (draft)' : 'Start FRAT'}
            </button>
          </div>
        )}
        {fratOpen && (
          <div className="mt-2 border-t pt-2">
            <StandaloneFRATForm
              userRole={user.role}
              initialData={{ flightNumber: tripNumber, aircraft: ac?.tailNumber, departure: leg.departureIcao, destination: leg.arrivalIcao,
                date: leg.departureTimeUtc.slice(0, 10), time: leg.departureTimeUtc.slice(11, 16), pic: user.displayName,
                selections: leg.fratDraft?.selections, mitigationNotes: leg.fratDraft?.mitigationNotes }}
              onClose={() => setFratOpen(false)}
              onSave={(data: FratSubmission & { status?: string }) => {
                if (data.status === 'submitted') {
                  submitFrat(data);
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
      <div className="border-t pt-3">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium">Airport review
            {leg.airportReviewed
              ? <span className="ml-2 text-xs text-emerald-700"><Check className="inline h-3.5 w-3.5" /> reviewed</span>
              : <span className="ml-2 text-xs text-muted-foreground">not reviewed</span>}
          </span>
          <button type="button" onClick={onOpenAirport}
            className="inline-flex items-center gap-0.5 text-xs text-primary hover:underline">
            View airport details <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        {!leg.airportReviewed && (
          <button className="mt-2 min-h-[44px] rounded border px-3 py-2 text-sm hover:bg-accent"
            onClick={() => markAirportReviewedOnLeg({ dispatch, newId, trip: tlTrip, leg, actorOid: user.oid })}>
            Mark airport reviewed
          </button>
        )}
      </div>
    </div>
  );
}
