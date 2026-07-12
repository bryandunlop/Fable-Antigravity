import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '../../ui/button';
import { Textarea } from '../../ui/textarea';
import { GfoPanel } from '../../gfo';
import type { FirAction } from '../reducer';
import type { FlightIrregularityReport } from '../types';

interface Props {
  fir: FlightIrregularityReport;
  canEdit: boolean;
  dispatch: React.Dispatch<FirAction>;
}

/** The owner's connective account — internal, full attribution allowed (§1, §7). */
export function NarrativeTab({ fir, canEdit, dispatch }: Props) {
  const [draft, setDraft] = useState(fir.narrative);
  useEffect(() => { setDraft(fir.narrative); }, [fir.id, fir.narrative]);

  if (!canEdit) {
    return (
      <GfoPanel title="Narrative">
        {fir.narrative ? (
          <p className="whitespace-pre-wrap text-sm">{fir.narrative}</p>
        ) : (
          <p className="text-sm text-muted-foreground">No narrative yet.</p>
        )}
      </GfoPanel>
    );
  }

  const dirty = draft !== fir.narrative;
  return (
    <GfoPanel
      title="Narrative"
      action={
        <Button size="sm" onClick={() => dispatch({ type: 'UPDATE_NARRATIVE', payload: { firId: fir.id, narrative: draft.trim() } })} disabled={!dirty}>
          <Save className="mr-1.5 h-4 w-4" /> Save
        </Button>
      }
    >
      <Textarea
        rows={12}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        placeholder="What actually happened and why — the connective account. Internal, owner-written; full attribution allowed."
      />
      <p className="mt-2 text-xs text-muted-foreground">Internal only. The de-identified, roles-only version is produced during publish (slice 3).</p>
    </GfoPanel>
  );
}
