import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { GfoPanel } from '../../gfo';
import type { FirAction } from '../reducer';
import type { FirImpact, FirImpactSnapshot, FlightIrregularityReport } from '../types';

interface Props {
  fir: FlightIrregularityReport;
  canEdit: boolean;
  /** Elapsed hours less the gaps the enterer excluded (D61 §4) — offered as the default downtime,
   *  owner can override. */
  derivedDowntimeHours?: number;
  /** D63 — the figures frozen on the published revision, when there is one. */
  publishedSnapshot?: FirImpactSnapshot;
  dispatch: React.Dispatch<FirAction>;
}

const numOrUndef = (v: string): number | undefined => (v === '' ? undefined : Number(v));

export function ImpactTab({ fir, canEdit, derivedDowntimeHours, publishedSnapshot, dispatch }: Props) {
  const [draft, setDraft] = useState<FirImpact>(fir.impact);
  useEffect(() => { setDraft(fir.impact); }, [fir.id, fir.impact]);

  const shownDowntime = fir.impact.downtimeHours ?? derivedDowntimeHours;
  const frozen = publishedSnapshot?.downtimeHours ?? publishedSnapshot?.elapsedHours;
  /** D63 — published and draft CAN disagree, and that is the evidence a correction landed after
   *  four-eyes approval. Say so on the tab where the number lives rather than quietly reconciling. */
  const divergence = publishedSnapshot && frozen != null && shownDowntime != null && Math.abs(frozen - shownDowntime) >= 0.1 ? (
    <p className="mt-3 border-t pt-2 text-xs text-amber-700 dark:text-amber-300">
      Published revision froze downtime at {frozen} h on {new Date(publishedSnapshot.capturedAtUtc).toLocaleDateString()};
      the tech log now reads {shownDowntime} h. The published figure does not move — publish a new revision to carry the correction.
    </p>
  ) : null;

  if (!canEdit) {
    const rows: [string, string | number | undefined][] = [
      ['Downtime', shownDowntime != null ? `${shownDowntime} h` : undefined],
      ['Delay', fir.impact.delayMinutes != null ? `${fir.impact.delayMinutes} min` : undefined],
      ['Trips affected', fir.impact.tripsAffected],
      ['Cost note', fir.impact.costNote],
    ];
    const any = rows.some(([, v]) => v != null && v !== '');
    return (
      <GfoPanel title="Impact">
        {any ? (
          <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            {rows.filter(([, v]) => v != null && v !== '').map(([k, v]) => (
              <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd>{v}</dd></div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">No impact recorded yet.</p>
        )}
        {divergence}
      </GfoPanel>
    );
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify(fir.impact);
  return (
    <GfoPanel
      title="Impact"
      action={
        <Button size="sm" onClick={() => dispatch({ type: 'UPDATE_IMPACT', payload: { firId: fir.id, impact: draft } })} disabled={!dirty}>
          <Save className="mr-1.5 h-4 w-4" /> Save
        </Button>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="imp-downtime" className="text-xs">Downtime (h)</Label>
          <Input id="imp-downtime" type="number" min="0" className="mt-1"
            value={draft.downtimeHours ?? ''}
            placeholder={derivedDowntimeHours != null ? `${derivedDowntimeHours} (from debrief)` : ''}
            onChange={e => setDraft(d => ({ ...d, downtimeHours: numOrUndef(e.target.value) }))} />
        </div>
        <div>
          <Label htmlFor="imp-delay" className="text-xs">Delay (min)</Label>
          <Input id="imp-delay" type="number" min="0" className="mt-1"
            value={draft.delayMinutes ?? ''}
            onChange={e => setDraft(d => ({ ...d, delayMinutes: numOrUndef(e.target.value) }))} />
        </div>
        <div>
          <Label htmlFor="imp-trips" className="text-xs">Trips affected</Label>
          <Input id="imp-trips" type="number" min="0" className="mt-1"
            value={draft.tripsAffected ?? ''}
            onChange={e => setDraft(d => ({ ...d, tripsAffected: numOrUndef(e.target.value) }))} />
        </div>
      </div>
      <div className="mt-4">
        <Label htmlFor="imp-cost" className="text-xs">Cost note</Label>
        <Textarea id="imp-cost" rows={3} className="mt-1"
          value={draft.costNote ?? ''}
          onChange={e => setDraft(d => ({ ...d, costNote: e.target.value || undefined }))}
          placeholder="Free text — e.g. repositioning flight, crew hotel, vendor AOG freight. No cost engine in v1." />
      </div>
      {derivedDowntimeHours != null && (
        <p className="mt-2 text-xs text-muted-foreground">
          Downtime defaults to {derivedDowntimeHours} h from the anchored debrief; override above if the operational number differs.
        </p>
      )}
      {divergence}
    </GfoPanel>
  );
}
