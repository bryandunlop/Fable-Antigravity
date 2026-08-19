import { useState } from 'react';
import { toast } from 'sonner';
import { Check } from 'lucide-react';
import { useTechLog, useCurrentUser } from '../../tech-log/TechLogContext';
import StandaloneFRATForm from '../../StandaloneFRATForm';
import { completeFratOnLeg, saveFratDraftOnLeg } from '../../tech-log/preflightActions';
import { extractFratSelections } from '../../tech-log/util/fratDraft';
import { newId } from '../../tech-log/util/id';
import { fratEarlySubmitWarning } from '../legContext';
import type { Trip, TripLeg } from '../../tech-log/types';

type FratSubmission = {
  totalScore?: number;
  items?: { title: string; items: { id: string; label: string; score: number; selected: boolean }[] }[];
  mitigationNotes?: string;
  additionalNotes?: string;
};

/**
 * The FRAT half of a leg: fill -> draft -> submit, with the early-submit soft warning.
 *
 * Extracted from LegDayOfSection so the prep matrix (D84) can open the SAME panel for any leg in a
 * slide-over. Prep is worked by item across legs, so FRAT has to be reachable without walking the
 * leg stepper — and a second copy of this form is how the early-submit warning would quietly stop
 * applying on one of the two paths.
 *
 * `autoOpen` is for the matrix, which has already expressed the intent by tapping the cell.
 */
export function LegFratSection({
  tlTrip, leg, tripNumber, autoOpen = false, onDone,
}: {
  tlTrip: Trip;
  leg: TripLeg;
  tripNumber: string;
  autoOpen?: boolean;
  onDone?: () => void;
}) {
  const { state, dispatch } = useTechLog();
  const ac = state.aircraft.find((a) => a.id === tlTrip.aircraftId);
  const user = useCurrentUser();
  const [fratOpen, setFratOpen] = useState(autoOpen);

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
    onDone?.();
  };

  // Opened from the prep matrix the surrounding sheet already names the leg and offers a close, so
  // the panel drops its own header and toggle rather than saying everything twice.
  const chrome = !autoOpen;

  return (
    <div className="text-sm">
      {chrome && <span className="font-medium">FRAT · leg {leg.sequence}
        {leg.fratStatus === 'COMPLETED' && <span className="ml-2 text-xs text-emerald-700"><Check className="inline h-3.5 w-3.5" /> submitted{leg.fratScore != null ? ` · ${leg.fratScore}` : ''}</span>}
        {leg.fratStatus === 'IN_PROGRESS' && <span className="ml-2 text-xs text-muted-foreground">draft saved</span>}
        {leg.fratStatus === 'NOT_STARTED' && <span className="ml-2 text-xs text-muted-foreground">not started</span>}
      </span>}
      {chrome && leg.fratStatus !== 'COMPLETED' && (
        <div>
          <button className="mt-2 min-h-[44px] rounded border px-3 py-2 text-sm hover:bg-accent"
            onClick={() => setFratOpen((o) => !o)}>
            {fratOpen ? 'Close FRAT' : leg.fratStatus === 'IN_PROGRESS' ? 'Resume FRAT (draft)' : 'Start FRAT'}
          </button>
        </div>
      )}
      {fratOpen && (
        <div className={chrome ? 'mt-2 border-t pt-2' : ''}>
          <StandaloneFRATForm
            userRole={user.role}
            initialData={{ flightNumber: tripNumber, aircraft: ac?.tailNumber, departure: leg.departureIcao, destination: leg.arrivalIcao,
              date: leg.departureTimeUtc.slice(0, 10), time: leg.departureTimeUtc.slice(11, 16), pic: user.displayName,
              selections: leg.fratDraft?.selections, mitigationNotes: leg.fratDraft?.mitigationNotes }}
            onClose={() => { setFratOpen(false); onDone?.(); }}
            onSave={(data: FratSubmission & { status?: string }) => {
              if (data.status === 'submitted') {
                submitFrat(data);
              } else if (data.status === 'draft') {
                saveFratDraftOnLeg({ dispatch, newId, trip: tlTrip, leg, actorOid: user.oid,
                  selections: extractFratSelections(data.items ?? []), mitigationNotes: data.mitigationNotes,
                  nowUtc: new Date().toISOString() });
                setFratOpen(false);
                toast.success('FRAT draft saved — resume any time before departure');
                onDone?.();
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
